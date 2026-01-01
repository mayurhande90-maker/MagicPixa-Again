
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { ApparelIcon, UploadIcon, XIcon, UserIcon, TrashIcon, UploadTrayIcon, CreditCoinIcon, SparklesIcon, PixaTryOnIcon, ArrowUpCircleIcon, InformationCircleIcon, CameraIcon, CheckIcon } from '../components/icons';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateApparelTryOn } from '../services/apparelService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ApparelStyles } from '../styles/features/MagicApparel.styles';

const CompactUpload: React.FC<{ label: string; subLabel?: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; }> = ({ label, subLabel, image, onUpload, onClear, icon, heightClass = "h-40" }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className={ApparelStyles.compactUpload}><div className="flex justify-between items-baseline mb-2 ml-1"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>{subLabel && <span className="text-[10px] text-gray-400 font-medium">{subLabel}</span>}</div>{image ? (<div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-all`}><img src={image.url} className="max-w-full max-h-full object-contain" alt={label} /><button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"><XIcon className="w-4 h-4"/></button></div>) : (<div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}><div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">{icon}</div><p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Upload {label}</p><p className="text-[9px] text-gray-300 mt-1">Best: Flat lay / White BG</p></div>)}<input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} /></div>
    );
};

export const MagicApparelStaging: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    // Standard State
    const [personImage, setPersonImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [topGarment, setTopGarment] = useState<{ url: string; base64: Base64File } | null>(null);
    const [bottomGarment, setBottomGarment] = useState<{ url: string; base64: Base64File } | null>(null);
    const [tuck, setTuck] = useState('');
    const [sleeve, setSleeve] = useState('');
    const [fit, setFit] = useState('');
    const [accessories, setAccessories] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Staging State: Live Mode
    const [isLiveMode, setIsLiveMode] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const captureCanvasRef = useRef<HTMLCanvasElement>(null);

    const cost = appConfig?.featureCosts['Pixa TryOn'] || appConfig?.featureCosts['Magic Apparel'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Scanning model biometrics...", "Analyzing garment texture...", "Simulating fabric drape...", "Aligning seams & shadows...", "Finalizing fashion render..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [loading]);

    // --- CAMERA HANDLERS ---
    
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
            }
        } catch (err) {
            console.error("Camera access failed", err);
            alert("Could not access camera. Please check permissions.");
            setIsLiveMode(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const handleEnterMirror = () => {
        setResultImage(null);
        setPersonImage(null);
        setIsLiveMode(true);
        startCamera();
    };

    const handleExitMirror = () => {
        stopCamera();
        setIsLiveMode(false);
    };

    const handleCapture = async () => {
        if (!videoRef.current || !captureCanvasRef.current) return;
        
        setIsCapturing(true);
        const video = videoRef.current;
        const canvas = captureCanvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Mirror back for the capture
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const base64 = dataUrl.split(',')[1];
            
            setPersonImage({ 
                url: dataUrl, 
                base64: { base64, mimeType: 'image/jpeg' } 
            });
            
            // Flash Effect
            setTimeout(() => {
                setIsCapturing(false);
                handleExitMirror();
            }, 300);
        }
    };

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { 
        if (e.target.files?.[0]) { 
            const file = e.target.files[0]; 
            const base64 = await fileToBase64(file); 
            setter({ url: URL.createObjectURL(file), base64 }); 
            if (setter === setPersonImage) setIsLiveMode(false);
        } 
        e.target.value = ''; 
    };

    const handleGenerate = async () => {
        if (!personImage || !auth.user) return; if (!topGarment && !bottomGarment) return; if (isLowCredits) { alert("Insufficient credits."); return; } setLoading(true); setResultImage(null); setLastCreationId(null);
        try { const res = await generateApparelTryOn(personImage.base64.base64, personImage.base64.mimeType, topGarment ? topGarment.base64 : null, bottomGarment ? bottomGarment.base64 : null, undefined, { tuck, sleeve, fit, accessories }, auth.activeBrandKit); const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl); const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa TryOn (Staging)'); setLastCreationId(creationId); const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa TryOn'); if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } catch (e: any) { console.error(e); alert(`Generation failed: ${e.message}`); } finally { setLoading(false); }
    };

    const handleNewSession = () => { setPersonImage(null); setTopGarment(null); setBottomGarment(null); setResultImage(null); setLastCreationId(null); setTuck(''); setSleeve(''); setFit(''); setAccessories(''); handleExitMirror(); };
    const handleEditorSave = async (newUrl: string) => { setResultImage(newUrl); if (lastCreationId && auth.user) await updateCreation(auth.user.uid, lastCreationId, newUrl); };
    
    const canGenerate = !!personImage && (!!topGarment || !!bottomGarment) && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Mirror (Staging)" 
                description="Live AR Staging Lab. Capture yourself in the mirror and let AI tailor your selected garments in real-time." 
                icon={<CameraIcon className="w-14 h-14"/>} 
                rawIcon={true} 
                creditCost={cost} 
                isGenerating={loading} 
                canGenerate={canGenerate} 
                onGenerate={handleGenerate} 
                resultImage={resultImage} 
                onResetResult={resultImage ? undefined : handleGenerate} 
                onNewSession={handleNewSession}
                onEdit={() => setShowMagicEditor(true)} 
                activeBrandKit={auth.activeBrandKit}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => {}} /> : null} 
                resultHeightClass="h-[800px]" 
                hideGenerateButton={isLowCredits} 
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Render My Outfit" }} 
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading && (
                            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        )}

                        {isCapturing && <div className="absolute inset-0 z-50 bg-white animate-flash"></div>}

                        {isLiveMode ? (
                            <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                />
                                
                                {/* GHOST OVERLAY (Selected Dress) */}
                                {(topGarment || bottomGarment) && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 animate-ghost-shimmer">
                                        <div className="w-1/2 aspect-[3/4] flex flex-col items-center justify-center">
                                            {topGarment && <img src={topGarment.url} className="w-full h-auto object-contain" alt="Ghost Top" />}
                                            {bottomGarment && <img src={bottomGarment.url} className="w-full h-auto object-contain -mt-4" alt="Ghost Bottom" />}
                                        </div>
                                    </div>
                                )}

                                {/* SILHOUETTE GUIDE */}
                                <div className="absolute inset-0 border-[10px] border-indigo-500/10 pointer-events-none flex items-center justify-center">
                                     <div className="w-64 h-[80%] border-2 border-dashed border-white/30 rounded-[3rem] animate-pulse"></div>
                                </div>

                                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                    <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Live Tracking Active</p>
                                </div>

                                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-6">
                                    <button onClick={handleExitMirror} className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl border border-white/10 backdrop-blur-md transition-all">
                                        <XIcon className="w-6 h-6"/>
                                    </button>
                                    <button 
                                        onClick={handleCapture}
                                        className="bg-white text-black px-12 py-4 rounded-2xl font-black text-sm shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
                                    >
                                        <CameraIcon className="w-5 h-5"/> SNAP PHOTO
                                    </button>
                                </div>
                            </div>
                        ) : personImage ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img src={personImage.url} className={`max-w-full max-h-full object-contain shadow-md transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Model" />
                                {!loading && (
                                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-40">
                                        <button onClick={() => fileInputRef.current?.click()} className="bg-white p-2.5 rounded-full shadow-md hover:bg-indigo-50 text-indigo-500 transition-all">
                                            <UploadIcon className="w-5 h-5"/>
                                        </button>
                                        <button onClick={handleNewSession} className="bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-red-500 transition-all">
                                            <XIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-8">
                                <div onClick={handleEnterMirror} className="group cursor-pointer relative bg-gradient-to-br from-indigo-600 to-blue-700 p-1 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-all">
                                    <div className="bg-white p-10 rounded-[2.2rem] flex flex-col items-center text-center gap-4">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                            <CameraIcon className="w-10 h-10"/>
                                        </div>
                                        <div>
                                            <p className="text-xl font-black text-gray-900 tracking-tight">Enter Live Mirror</p>
                                            <p className="text-xs text-gray-400 font-medium mt-1">Real-time body tracking & AR overlay</p>
                                        </div>
                                    </div>
                                    <div className="absolute -inset-4 bg-indigo-500/10 rounded-[3rem] -z-10 blur-xl animate-pulse"></div>
                                </div>
                                
                                <div className="flex items-center gap-4 w-full max-w-xs">
                                    <div className="h-px bg-gray-200 flex-1"></div>
                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Or Upload</span>
                                    <div className="h-px bg-gray-200 flex-1"></div>
                                </div>

                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-100 transition-all">
                                    <UploadIcon className="w-4 h-4"/> Browse Files
                                </button>
                            </div>
                        )}
                        <canvas ref={captureCanvasRef} className="hidden" />
                        <style>{`
                            @keyframes flash { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
                            .animate-flash { animation: flash 0.3s ease-out forwards; }
                            @keyframes ghost-shimmer { 0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 0 10px rgba(79, 70, 229, 0.2)); } 50% { transform: translateY(-5px) scale(1.02); filter: drop-shadow(0 0 25px rgba(79, 70, 229, 0.5)); } }
                            .animate-ghost-shimmer { animation: ghost-shimmer 3s ease-in-out infinite; }
                            @keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }
                        `}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>) : (
                        <div className={`space-y-6 p-1 animate-fadeIn transition-all duration-300 ${(!isLiveMode && !personImage) || loading ? 'opacity-40 pointer-events-none select-none filter grayscale-[0.3]' : ''}`}>
                            <div>
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-4"><span className={ApparelStyles.stepBadge}>2</span><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Garments</label></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload label="Upper Wear" image={topGarment} onUpload={handleUpload(setTopGarment)} onClear={() => setTopGarment(null)} icon={<ApparelIcon className="w-6 h-6 text-indigo-400"/>} heightClass="h-44" />
                                    <CompactUpload label="Bottom Wear" image={bottomGarment} onUpload={handleUpload(setBottomGarment)} onClear={() => setBottomGarment(null)} icon={<ApparelIcon className="w-6 h-6 text-purple-400"/>} heightClass="h-44" />
                                </div>
                                <div className="mt-4 px-1 space-y-1.5 animate-fadeIn">
                                    <p className="text-[10px] text-gray-400 font-medium leading-tight flex items-start gap-2">
                                        <span className="w-1 h-1 bg-indigo-300 rounded-full mt-1.5 shrink-0"></span>
                                        Upload at least one garment to proceed.
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium leading-tight flex items-start gap-2">
                                        <span className="w-1 h-1 bg-indigo-300 rounded-full mt-1.5 shrink-0"></span>
                                        To transfer a full outfit, upload the same image to both slots.
                                    </p>
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-6 space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-4">
                                    <span className={ApparelStyles.stepBadge}>3</span>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Styling Preferences</label>
                                </div>
                                <SelectionGrid label="Tuck Style" options={['Untucked', 'Tucked In']} value={tuck} onChange={setTuck} />
                                <SelectionGrid label="Sleeve" options={['Long', 'Rolled Up']} value={sleeve} onChange={setSleeve} />
                                <SelectionGrid label="Fit" options={['Regular', 'Slim Fit', 'Oversized']} value={fit} onChange={setFit} />
                                
                                <div className="relative pt-2">
                                    <InputField 
                                        label="Accessories & Additional Styling (Optional)" 
                                        placeholder="e.g. wearing a gold watch, holding a black leather bag, add sunglasses" 
                                        value={accessories} 
                                        onChange={(e: any) => setAccessories(e.target.value)} 
                                    />
                                    <div className="flex items-center gap-1.5 absolute top-2 right-1">
                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Smart Stylist Active</span>
                                    </div>
                                    <p className="text-[9px] text-gray-400 px-1 -mt-4 italic">Pixa will intelligently anchor these items to your model.</p>
                                </div>
                            </div>
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setPersonImage)} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={async () => {}} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={async () => {}} />}
        </>
    );
};
