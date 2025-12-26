
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { MockupIcon, UploadIcon, XIcon, UploadTrayIcon, SparklesIcon, CreditCoinIcon, MagicWandIcon, TrashIcon, PaletteIcon, ArrowUpCircleIcon, PixaMockupIcon, CheckIcon, ApparelIcon, CubeIcon, MockupIcon as TechIcon, BuildingIcon, DocumentTextIcon, ChevronLeftRightIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicMockup } from '../services/mockupService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { MockupStyles } from '../styles/features/MagicMockup.styles';

// Silhouettes mapping
const SILHOUETTES: Record<string, React.ReactNode> = {
    'T-Shirt': <ApparelIcon className="w-64 h-64" />,
    'Hoodie': <ApparelIcon className="w-64 h-64" />,
    'iPhone 15': <TechIcon className="w-48 h-64" />,
    'MacBook': <TechIcon className="w-80 h-64" />,
    'Coffee Mug': <CubeIcon className="w-48 h-48" />,
    'Water Bottle': <CubeIcon className="w-32 h-64" />,
    'Tote Bag': <ApparelIcon className="w-64 h-64" />,
    'Notebook': <DocumentTextIcon className="w-48 h-64" />,
    'Packaging Box': <CubeIcon className="w-64 h-64" />,
    'Wall Sign': <BuildingIcon className="w-80 h-48" />,
    'Default': <PixaMockupIcon className="w-64 h-64" />
};

export const MagicMockup: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [designImage, setDesignImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [targetObject, setTargetObject] = useState('');
    const [customObject, setCustomObject] = useState(''); 
    const [material, setMaterial] = useState('');
    const [sceneVibe, setSceneVibe] = useState('');
    const [objectColor, setObjectColor] = useState(''); 
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Placement State (Normalized 0-1000)
    const [placement, setPlacement] = useState({ x: 350, y: 250, w: 300, h: 300 });
    const [isMoving, setIsMoving] = useState(false);
    const [isResizing, setIsResizing] = useState<string | null>(null);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);
    // Added missing scrollRef and fileInputRef
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa Mockups'] || appConfig?.featureCosts['Magic Mockup'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = designImage && userCredits < cost;

    const objectOptions = ['T-Shirt', 'Hoodie', 'iPhone 15', 'MacBook', 'Coffee Mug', 'Water Bottle', 'Tote Bag', 'Notebook', 'Business Card', 'Packaging Box', 'Neon Sign', 'Wall Sign', 'Other / Custom'];
    const materialOptions = ['Standard Ink', 'Embroidery', 'Gold Foil', 'Silver Foil', 'Deboss', 'Emboss', 'Laser Etch', 'Smart Object'];
    const vibeOptions = ['Studio Clean', 'Lifestyle', 'Cinematic', 'Nature', 'Urban'];
    
    const premiumColors = [
        { name: 'White', hex: '#FFFFFF', isLight: true },
        { name: 'Black', hex: '#1A1A1E', isLight: false },
        { name: 'Slate', hex: '#475569', isLight: false },
        { name: 'Navy', hex: '#1E3A8A', isLight: false },
        { name: 'Forest', hex: '#14532D', isLight: false },
        { name: 'Burgundy', hex: '#7F1D1D', isLight: false },
        { name: 'Cream', hex: '#F5F5DC', isLight: true },
    ];

    useEffect(() => { let interval: any; if (loading) { const steps = ["Pixa is mapping surface...", "Pixa is simulating physics...", "Pixa is calculating reflections...", "Pixa is rendering textures...", "Pixa is polishing pixels..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 1500); } return () => clearInterval(interval); }, [loading]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);
    const autoScroll = () => { if (scrollRef.current) setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100); };
    
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { 
        if (e.target.files?.[0]) { 
            const file = e.target.files[0]; 
            const base64 = await fileToBase64(file); 
            setDesignImage({ url: URL.createObjectURL(file), base64 }); 
            setResultImage(null); 
            // Reset placement to default on new upload
            setPlacement({ x: 350, y: 250, w: 300, h: 300 });
        } 
        e.target.value = ''; 
    };

    const handleGenerate = async () => {
        const finalTarget = targetObject === 'Other / Custom' ? customObject : targetObject;
        if (!designImage || !auth.user || !finalTarget || !material || !sceneVibe) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResultImage(null); setLastCreationId(null);

        // Convert normalized coordinates to Gemini format [ymin, xmin, ymax, xmax]
        const ymin = Math.round(placement.y);
        const xmin = Math.round(placement.x);
        const ymax = Math.round(placement.y + placement.h);
        const xmax = Math.round(placement.x + placement.w);

        try { 
            const res = await generateMagicMockup(
                designImage.base64.base64, 
                designImage.base64.mimeType, 
                finalTarget, 
                material, 
                sceneVibe, 
                objectColor, 
                auth.activeBrandKit,
                { ymin, xmin, ymax, xmax }
            ); 
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl); 
            const dataUri = `data:image/png;base64,${res}`; 
            const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Mockups'); setLastCreationId(creationId); 
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Mockups'); 
            if (updatedUser.lifetimeGenerations) { 
                const bonus = checkMilestone(updatedUser.lifetimeGenerations); 
                if (bonus !== false) setMilestoneBonus(bonus); 
            } 
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); 
        } catch (e) { 
            console.error(e); 
            alert("Generation failed. Please try again."); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Mockup Generation", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setDesignImage(null); setResultImage(null); setTargetObject(''); setCustomObject(''); setMaterial(''); setSceneVibe(''); setObjectColor(''); setLastCreationId(null); setPlacement({ x: 350, y: 250, w: 300, h: 300 }); };
    const handleEditorSave = async (newUrl: string) => { setResultImage(newUrl); if (lastCreationId && auth.user) await updateCreation(auth.user.uid, lastCreationId, newUrl); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    
    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
        if (val.length > 6) val = val.substring(0, 6);
        setObjectColor(val ? `#${val}` : '');
    };

    // --- INTERACTIVE PLACEMENT LOGIC ---

    const handleMouseDown = (e: React.MouseEvent, type: 'move' | string) => {
        if (loading) return;
        e.preventDefault();
        e.stopPropagation();
        if (type === 'move') setIsMoving(true);
        else setIsResizing(type);
        setStartPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isMoving && !isResizing) return;
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const dx = (e.clientX - startPos.x) * (1000 / rect.width);
        const dy = (e.clientY - startPos.y) * (1000 / rect.height);

        setPlacement(prev => {
            let next = { ...prev };
            if (isMoving) {
                next.x = Math.max(0, Math.min(1000 - prev.w, prev.x + dx));
                next.y = Math.max(0, Math.min(1000 - prev.h, prev.y + dy));
            } else if (isResizing) {
                const minSize = 50;
                if (isResizing.includes('S')) next.h = Math.max(minSize, Math.min(1000 - prev.y, prev.h + dy));
                if (isResizing.includes('E')) next.w = Math.max(minSize, Math.min(1000 - prev.x, prev.w + dx));
                if (isResizing.includes('N')) {
                    const newH = Math.max(minSize, prev.h - dy);
                    if (newH !== prev.h) { next.y = prev.y + (prev.h - newH); next.h = newH; }
                }
                if (isResizing.includes('W')) {
                    const newW = Math.max(minSize, prev.w - dx);
                    if (newW !== prev.w) { next.x = prev.x + (prev.w - newW); next.w = newW; }
                }
            }
            return next;
        });
        setStartPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        setIsMoving(false);
        setIsResizing(null);
    };

    const finalTarget = targetObject === 'Other / Custom' ? customObject : targetObject;
    const canGenerate = !!designImage && !!finalTarget && !!material && !!sceneVibe && !isLowCredits;
    const isCustomActive = objectColor && !premiumColors.find(c => c.name === objectColor || c.hex.toLowerCase() === objectColor.toLowerCase());

    const activeSilhouette = SILHOUETTES[targetObject] || SILHOUETTES['Default'];

    return (
        <>
            <FeatureLayout 
                title="Pixa Mockups" description="The Reality Engine. Turn flat designs into photorealistic physical objects with accurate material physics." icon={<PixaMockupIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId}
                onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession}
                onEdit={() => setShowMagicEditor(true)} activeBrandKit={auth.activeBrandKit}
                isBrandCritical={true}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                resultHeightClass="h-[800px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Mockup" }} scrollRef={scrollRef}
                leftContent={
                    designImage ? (
                        <div 
                            ref={canvasRef}
                            className={MockupStyles.placementCanvas}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            {/* SILHOUETTE LAYER */}
                            <div className={MockupStyles.silhouetteLayer}>
                                {activeSilhouette}
                            </div>

                            {/* LOGO PROXY */}
                            <div 
                                className={`${MockupStyles.logoProxy} ${(isMoving || isResizing) ? MockupStyles.logoProxyActive : ''}`}
                                style={{
                                    left: `${placement.x / 10}%`,
                                    top: `${placement.y / 10}%`,
                                    width: `${placement.w / 10}%`,
                                    height: `${placement.h / 10}%`
                                }}
                                onMouseDown={(e) => handleMouseDown(e, 'move')}
                            >
                                <img src={designImage.url} className={MockupStyles.logoPreview} alt="Design Proxy" />
                                
                                {/* Resizers */}
                                <div className={`${MockupStyles.handle} ${MockupStyles.handleNW}`} onMouseDown={(e) => handleMouseDown(e, 'NW')} />
                                <div className={`${MockupStyles.handle} ${MockupStyles.handleNE}`} onMouseDown={(e) => handleMouseDown(e, 'NE')} />
                                <div className={`${MockupStyles.handle} ${MockupStyles.handleSW}`} onMouseDown={(e) => handleMouseDown(e, 'SW')} />
                                <div className={`${MockupStyles.handle} ${MockupStyles.handleSE}`} onMouseDown={(e) => handleMouseDown(e, 'SE')} />
                            </div>

                            {/* INFO HUD */}
                            <div className={MockupStyles.coordBadge}>
                                <p className={MockupStyles.coordText}>X: {Math.round(placement.x)} Y: {Math.round(placement.y)} | SCALE: {Math.round((placement.w/1000)*100)}%</p>
                            </div>

                            <div className={MockupStyles.instructionPill}>
                                <ChevronLeftRightIcon className="w-3 h-3 text-indigo-500 animate-pulse" />
                                <span className={MockupStyles.instructionText}>Drag to position • Corners to resize</span>
                            </div>

                            {!loading && (
                                <button onClick={() => setDesignImage(null)} className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all z-40">
                                    <XIcon className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={async (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) { const file = e.target.files[0]; const b64 = await fileToBase64(file); setDesignImage({ url: URL.createObjectURL(file), base64: b64 }); } }} className={`h-full w-full border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'}`}>
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300"><PixaMockupIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" /></div>
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Design / Logo</p>
                                <div className="bg-gray-50 rounded-full px-3 py-1 inline-block"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to Browse</p></div>
                                <p className="text-[10px] text-gray-400 mt-3 font-medium">Recommended: High-res PNG with transparent background.</p>
                            </div>
                        </div>
                    )
                }
                rightContent={
                    <div className={`space-y-8 p-1 animate-fadeIn transition-all duration-300 ${!designImage ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                        <div>
                            <div className="flex items-center justify-between mb-3 ml-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Select Item</label></div>
                            <div className="flex flex-wrap gap-2">
                                {objectOptions.map(opt => (<button key={opt} onClick={() => { setTargetObject(opt); if(opt !== 'Other / Custom') autoScroll(); }} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-300 transform active:scale-95 ${targetObject === opt ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm'}`}>{opt}</button>))}
                            </div>
                            {targetObject === 'Other / Custom' && (<div className="mt-3 animate-fadeIn"><InputField placeholder="Describe object (e.g. Vintage Hat)" value={customObject} onChange={(e: any) => setCustomObject(e.target.value)} /></div>)}
                        </div>
                        
                        <SelectionGrid label="2. Material Physics" options={materialOptions} value={material} onChange={(val) => { setMaterial(val); autoScroll(); }} />
                        <SelectionGrid label="3. Scene Vibe" options={vibeOptions} value={sceneVibe} onChange={setSceneVibe} />
                        
                        <div className="animate-fadeIn">
                            <div className="flex items-center justify-between mb-4 ml-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">4. Object Colour</label>
                                {objectColor && <button onClick={() => setObjectColor('')} className="text-[10px] text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors">Reset</button>}
                            </div>
                            <div className={MockupStyles.colorGrid}>
                                {premiumColors.map(c => {
                                    const isSelected = objectColor === c.name || objectColor === c.hex;
                                    return (
                                        <div key={c.name} className={MockupStyles.colorItem}>
                                            <button onClick={() => setObjectColor(c.name)} className={`${MockupStyles.colorSwatch} ${isSelected ? MockupStyles.colorSwatchActive : MockupStyles.colorSwatchInactive}`} style={{ backgroundColor: c.hex }} title={c.name}>
                                                {isSelected && <CheckIcon className={c.isLight ? MockupStyles.checkIconDark : MockupStyles.checkIcon} />}
                                            </button>
                                        </div>
                                    );
                                })}
                                <div className={MockupStyles.colorItem}>
                                    <div className={`${MockupStyles.customGroup} ${isCustomActive ? 'border-indigo-400 bg-indigo-50/30' : ''}`}>
                                        <div className={MockupStyles.customPicker} style={{ backgroundColor: isCustomActive ? objectColor : '#fff', backgroundImage: !isCustomActive ? 'linear-gradient(45deg, #f87171, #60a5fa, #34d399)' : 'none' }}>
                                            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={objectColor && objectColor.startsWith('#') ? objectColor : '#4d7cff'} onChange={(e) => { setObjectColor(e.target.value); }} />
                                            {!isCustomActive && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><PaletteIcon className="w-3 h-3 text-white drop-shadow-sm" /></div>}
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-[10px] font-bold text-gray-400 ml-1.5 mr-0.5">#</span>
                                            <input type="text" className={MockupStyles.customHexInput} placeholder="Hex" value={objectColor && objectColor.startsWith('#') ? objectColor.replace('#', '') : ''} onChange={handleHexChange} />
                                        </div>
                                    </div>
                                    <span className={`${MockupStyles.colorLabel} ${isCustomActive ? MockupStyles.colorLabelActive : ''}`}>Custom</span>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Pixa Mockups" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
