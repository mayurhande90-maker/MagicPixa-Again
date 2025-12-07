
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { 
    ApparelIcon, 
    UploadIcon, 
    XIcon, 
    UserIcon,
    TrashIcon,
    UploadTrayIcon,
    CreditCoinIcon,
    SparklesIcon,
    PixaTryOnIcon
} from '../components/icons';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateApparelTryOn } from '../services/apparelService';
import { saveCreation, deductCredits } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { MagicEditorModal } from '../components/MagicEditorModal';

// Compact Upload Component for the Right Panel
const CompactUpload: React.FC<{ 
    label: string; 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void;
    icon: React.ReactNode;
    heightClass?: string;
    optional?: boolean;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32", optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label} {optional && <span className="text-gray-300 font-normal">(Optional)</span>}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain" alt={label} />
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"
                    >
                        <XIcon className="w-4 h-4"/>
                    </button>
                </div>
            ) : (
                <div 
                    onClick={() => inputRef.current?.click()}
                    className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}
                >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Upload {label}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const MagicApparel: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // State
    const [personImage, setPersonImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [topImage, setTopImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [bottomImage, setBottomImage] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // Styling Options
    const [tuckStyle, setTuckStyle] = useState('Untucked');
    const [fitStyle, setFitStyle] = useState('Regular Fit');
    const [sleeveStyle, setSleeveStyle] = useState('Standard');

    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    
    const [isDragging, setIsDragging] = useState(false);
    const [showMagicEditor, setShowMagicEditor] = useState(false);

    // Refund State
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    
    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Cost
    const cost = appConfig?.featureCosts['Pixa TryOn'] || appConfig?.featureCosts['Magic Apparel'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // Animation
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Mapping body points...", "Analysing fabric physics...", "Draping garments...", "Adjusting lighting...", "Finalizing fit..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (result) URL.revokeObjectURL(result);
        };
    }, [result]);

    const autoScroll = () => {
        if (scrollRef.current) {
            setTimeout(() => {
                const element = scrollRef.current;
                if (element) {
                    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
                }
            }, 100); 
        }
    };

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
            setResult(null); // Reset result on new upload
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!personImage || (!topImage && !bottomImage) || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResult(null);
        setLastCreationId(null);

        try {
            const res = await generateApparelTryOn(
                personImage.base64.base64,
                personImage.base64.mimeType,
                topImage?.base64 || null,
                bottomImage?.base64 || null,
                undefined,
                {
                    tuck: tuckStyle,
                    fit: fitStyle,
                    sleeve: sleeveStyle
                }
            );

            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa TryOn');
            setLastCreationId(creationId);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa TryOn');
            
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

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !result) return;
        setIsRefunding(true);
        try {
            const res = await processRefundRequest(
                auth.user.uid,
                auth.user.email,
                cost,
                reason,
                "Virtual Try-On",
                lastCreationId || undefined
            );
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
        } catch (e: any) {
            alert("Refund processing failed: " + e.message);
        } finally {
            setIsRefunding(false);
        }
    };

    const handleNewSession = () => {
        setPersonImage(null);
        setTopImage(null);
        setBottomImage(null);
        setResult(null);
        setLastCreationId(null);
        setTuckStyle('Untucked');
        setFitStyle('Regular Fit');
        setSleeveStyle('Standard');
    };

    const handleEditorSave = (newUrl: string) => {
        setResult(newUrl);
        saveCreation(auth.user!.uid, newUrl, 'Pixa TryOn (Edited)');
    };

    const handleDeductEditCredit = async () => {
        if(auth.user) {
            const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
    };

    const canGenerate = !!personImage && (!!topImage || !!bottomImage) && !isLowCredits;

    // Drag and Drop for Main Image (Person)
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const base64 = await fileToBase64(file);
                setPersonImage({ url: URL.createObjectURL(file), base64 });
                setResult(null);
            }
        }
    };

    return (
        <>
            <FeatureLayout 
                title="Pixa TryOn"
                description="Virtually try on clothes. Upload a person and garments to see how they look."
                icon={<PixaTryOnIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={result}
                
                onResetResult={result ? undefined : () => setResult(null)}
                onNewSession={result ? undefined : handleNewSession}
                resultOverlay={
                    result ? (
                        <ResultToolbar 
                            onNew={handleNewSession}
                            onRegen={handleGenerate}
                            onEdit={() => setShowMagicEditor(true)}
                            onReport={() => setShowRefundModal(true)}
                        />
                    ) : null
                }

                resultHeightClass="h-[800px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Generate Try-On"
                }}
                scrollRef={scrollRef}
                leftContent={
                    personImage ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {loading && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                    <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                                </div>
                            )}
                            
                            <img src={personImage.url} className={`max-w-full max-h-full object-contain shadow-md transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Model" />
                            
                            {!loading && (
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"
                                    title="Change Model"
                                >
                                    <UploadIcon className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${
                                isDragging 
                                ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' 
                                : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'
                            }`}
                        >
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                                <PixaTryOnIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" />
                            </div>
                            
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Model Photo</p>
                                <div className="bg-gray-50 rounded-full px-3 py-1 inline-block">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to Browse</p>
                                </div>
                            </div>

                            {isDragging && (
                                <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none">
                                    <div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-indigo-100 animate-bounce">
                                        <p className="text-lg font-bold text-indigo-600 flex items-center gap-2">
                                            <UploadIcon className="w-5 h-5"/> Drop to Upload!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            {/* 1. Garment Uploads */}
                            <div>
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Upload Garments</label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload
                                        label="Upper Wear"
                                        image={topImage}
                                        onUpload={handleUpload(setTopImage)}
                                        onClear={() => setTopImage(null)}
                                        icon={<ApparelIcon className="w-6 h-6 text-blue-400" />}
                                        optional={true}
                                    />
                                    <CompactUpload
                                        label="Lower Wear"
                                        image={bottomImage}
                                        onUpload={handleUpload(setBottomImage)}
                                        onClear={() => setBottomImage(null)}
                                        icon={<ApparelIcon className="w-6 h-6 text-purple-400" />}
                                        optional={true}
                                    />
                                </div>
                            </div>

                            {/* 2. Styling Options */}
                            <div className="animate-fadeIn">
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">2. Styling Preferences</label>
                                </div>
                                <div className="space-y-4">
                                    <SelectionGrid label="Tuck Style" options={['Untucked', 'Tucked In', 'Half Tuck', 'Cropped']} value={tuckStyle} onChange={setTuckStyle} />
                                    <SelectionGrid label="Fit" options={['Regular Fit', 'Slim Fit', 'Oversized', 'Loose']} value={fitStyle} onChange={setFitStyle} />
                                    <SelectionGrid label="Sleeve Length" options={['Standard', 'Rolled Up', 'Short', 'Long']} value={sleeveStyle} onChange={setSleeveStyle} />
                                </div>
                            </div>
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setPersonImage)} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
            
            {/* Magic Editor Modal */}
            {showMagicEditor && result && (
                <MagicEditorModal 
                    imageUrl={result} 
                    onClose={() => setShowMagicEditor(false)} 
                    onSave={handleEditorSave}
                    deductCredit={handleDeductEditCredit}
                />
            )}

            {/* Refund Modal */}
            {showRefundModal && (
                <RefundModal 
                    onClose={() => setShowRefundModal(false)}
                    onConfirm={handleRefundRequest}
                    isProcessing={isRefunding}
                    featureName="Virtual Try-On"
                />
            )}

            {/* Notification */}
            {notification && (
                <ToastNotification 
                    message={notification.msg} 
                    type={notification.type} 
                    onClose={() => setNotification(null)} 
                />
            )}
        </>
    );
};
