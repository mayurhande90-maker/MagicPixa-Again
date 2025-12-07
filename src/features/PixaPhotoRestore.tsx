<change>
<file>src/features/PixaPhotoRestore.tsx</file>
<description>Update ResultToolbar to expand on hover over the image group</description>
<content><![CDATA[
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { 
    PixaRestoreIcon, 
    UploadIcon, 
    XIcon, 
    UploadTrayIcon, 
    SparklesIcon, 
    CreditCoinIcon, 
    MagicWandIcon, 
    PaletteIcon,
    CameraIcon,
    CheckIcon,
    InformationCircleIcon,
    ShieldCheckIcon,
    FlagIcon,
    TrashIcon,
    RegenerateIcon,
    PlusIcon
} from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { colourizeImage } from '../services/imageToolsService';
import { saveCreation, deductCredits } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

// Updated Premium Mode Card (Compact Horizontal Layout)
const ModeCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
    accentColor: string; // CSS class for text color e.g. "text-purple-500"
}> = ({ title, description, icon, selected, onClick, accentColor }) => {
    return (
        <button 
            onClick={onClick}
            className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all w-full text-left overflow-hidden group ${
                selected 
                ? 'border-transparent bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg transform scale-[1.01]'
                : 'border-gray-100 bg-white hover:border-indigo-100 hover:shadow-md'
            }`}
        >
            {/* Icon Box */}
            <div className={`shrink-0 p-3 rounded-xl transition-colors ${
                selected ? 'bg-white/20 text-white' : `bg-gray-50 ${accentColor}`
            }`}>
                {icon}
            </div>
            
            {/* Text Content */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <h3 className={`font-bold text-sm ${selected ? 'text-white' : 'text-gray-800'}`}>{title}</h3>
                    {selected && <CheckIcon className="w-4 h-4 text-white" />}
                </div>
                
                <p className={`text-xs leading-snug ${selected ? 'text-indigo-100' : 'text-gray-400'}`}>{description}</p>
                
                {selected && (
                    <div className="mt-2 flex items-center gap-1.5 opacity-90 animate-fadeIn">
                        <ShieldCheckIcon className="w-3 h-3 text-emerald-300" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wide">Identity Lock</span>
                    </div>
                )}
            </div>

            {/* Background Decoration */}
            {selected && (
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            )}
        </button>
    );
};

// Refund Modal
const RefundModal: React.FC<{ 
    onClose: () => void; 
    onConfirm: (reason: string) => void;
    isProcessing: boolean;
}> = ({ onClose, onConfirm, isProcessing }) => {
    const [reason, setReason] = useState('');
    const reasons = [
        "Faces are distorted / blurry",
        "Colorization is unnatural",
        "Restoration didn't fix damage",
        "Glitch or Artifacts in image",
        "Other"
    ];

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative m-4" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <XIcon className="w-5 h-5"/>
                </button>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FlagIcon className="w-5 h-5 text-red-500"/> Report Quality Issue
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    We're sorry the restoration didn't work perfectly. Select a reason to request a refund.
                </p>

                <div className="space-y-2 mb-6">
                    {reasons.map(r => (
                        <button 
                            key={r}
                            onClick={() => setReason(r)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
                                reason === r 
                                ? 'bg-red-50 border-red-500 text-red-700' 
                                : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold text-xs hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                    <button 
                        onClick={() => onConfirm(reason)}
                        disabled={!reason || isProcessing}
                        className="flex-1 py-3 bg-[#1A1A1E] text-white rounded-xl font-bold text-xs hover:bg-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Submit & Refund"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Low Quality Warning Component
const SmartWarning: React.FC<{ issues: string[] }> = ({ issues }) => {
    if (issues.length === 0) return null;
    return (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 flex items-start gap-2 animate-fadeIn mx-auto max-w-sm">
            <InformationCircleIcon className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
            <div>
                <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide mb-1">Low Resolution Detected</p>
                <ul className="list-disc list-inside text-xs text-orange-600 space-y-0.5">
                    {issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// Top Right Vertical Toolbar
const ResultToolbar: React.FC<{
    onNew: () => void;
    onRegen: () => void;
    onEdit: () => void;
    onReport: () => void;
}> = ({ onNew, onRegen, onEdit, onReport }) => {
    const buttons = [
        { label: 'New Project', icon: PlusIcon, onClick: onNew, color: 'text-gray-700', bg: 'hover:bg-gray-100' },
        { label: 'Regenerate', icon: RegenerateIcon, onClick: onRegen, color: 'text-blue-600', bg: 'hover:bg-blue-50' },
        { label: 'Magic Editor', icon: MagicWandIcon, onClick: onEdit, color: 'text-purple-600', bg: 'hover:bg-purple-50' },
        { label: 'Report Issue', icon: FlagIcon, onClick: onReport, color: 'text-red-500', bg: 'hover:bg-red-50' },
    ];

    return (
        <div className="flex flex-col gap-2 items-end">
            {buttons.map((btn, idx) => (
                <button
                    key={btn.label}
                    onClick={btn.onClick}
                    className={`flex items-center justify-start gap-0 group-hover:gap-3 px-3 py-2.5 bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-gray-100 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-105 hover:shadow-md ${btn.bg} animate-[fadeInRight_0.4s_ease-out]`}
                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' }}
                >
                    <btn.icon className={`w-5 h-5 ${btn.color} shrink-0`} />
                    <span className={`text-xs font-bold ${btn.color} overflow-hidden whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-[140px] group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]`}>
                        {btn.label}
                    </span>
                </button>
            ))}
            <style>{`
                @keyframes fadeInRight {
                    from { opacity: 0; transform: translateX(10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};

export const PixaPhotoRestore: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // State
    const [image, setImage] = useState<{ url: string; base64: Base64File; warnings?: string[] } | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [restoreMode, setRestoreMode] = useState<'restore_color' | 'restore_only' | null>(null);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Refund State
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cost (Default to 2, or use config)
    const cost = appConfig?.featureCosts['Pixa Photo Restore'] || appConfig?.featureCosts['Magic Photo Colour'] || 2;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // Animation
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = [
                "Scanning for damage...", 
                "Analyzing facial biometric points...", 
                "Repairing scratches & tears...", 
                "Enhancing details...", 
                "Finalizing output..."
            ];
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
            if (resultImage) URL.revokeObjectURL(resultImage);
        };
    }, [resultImage]);

    const validateImage = async (file: File): Promise<string[]> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const warnings = [];
                if (img.width < 300 || img.height < 300) warnings.push("Image is very small. Restoration quality might be limited.");
                resolve(warnings);
            };
        });
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            const warnings = await validateImage(file);
            setImage({ url: URL.createObjectURL(file), base64, warnings });
            setResultImage(null);
        }
        e.target.value = '';
    };

    // Drag & Drop
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const base64 = await fileToBase64(file);
                const warnings = await validateImage(file);
                setImage({ url: URL.createObjectURL(file), base64, warnings });
                setResultImage(null);
            } else {
                alert("Please drop a valid image file.");
            }
        }
    };

    const handleGenerate = async () => {
        if (!image || !restoreMode || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);
        setLastCreationId(null);

        try {
            const res = await colourizeImage(
                image.base64.base64,
                image.base64.mimeType,
                restoreMode
            );

            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Photo Restore');
            setLastCreationId(creationId);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Photo Restore');
            
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

        } catch (e) {
            console.error(e);
            alert("Restoration failed. Please try again with a simpler image.");
        } finally {
            setLoading(false);
        }
    };

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !resultImage) return;
        setIsRefunding(true);
        try {
            const res = await processRefundRequest(
                auth.user.uid,
                auth.user.email,
                cost,
                reason,
                "Restored Image",
                lastCreationId || undefined
            );

            if (res.success) {
                if (res.type === 'refund') {
                    auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null);
                    setResultImage(null); 
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
        setImage(null);
        setResultImage(null);
        setRestoreMode(null);
        setLastCreationId(null);
    };

    const handleEditorSave = (newUrl: string) => {
        setResultImage(newUrl);
        saveCreation(auth.user!.uid, newUrl, 'Pixa Photo Restore (Edited)');
    };

    const handleDeductEditCredit = async () => {
        if(auth.user) {
            const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
    };

    const canGenerate = !!image && !!restoreMode && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Photo Restore"
                description="Professional restoration suite. Fix damage, enhance resolution, and optionally colorize."
                icon={<PixaRestoreIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                
                // Hide default bottom buttons when result is present, because we use custom top-right toolbar
                onResetResult={resultImage ? undefined : handleGenerate} 
                onNewSession={resultImage ? undefined : handleNewSession}
                
                resultHeightClass="h-[750px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Begin Restoration"
                }}
                scrollRef={scrollRef}
                
                // Custom Vertical Toolbar in Top-Right
                resultOverlay={
                    resultImage ? (
                        <ResultToolbar 
                            onNew={handleNewSession}
                            onRegen={handleGenerate}
                            onEdit={() => setShowMagicEditor(true)}
                            onReport={() => setShowRefundModal(true)}
                        />
                    ) : null
                }
                
                // Left: Upload Canvas
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {loading && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                    <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                                </div>
                            )}
                            
                            <img src={image.url} className={`max-w-full max-h-full object-contain shadow-md transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Original" />
                            
                            {!loading && (
                                <>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()} 
                                        className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"
                                        title="Change Image"
                                    >
                                        <UploadIcon className="w-5 h-5"/>
                                    </button>
                                    {image.warnings && image.warnings.length > 0 && (
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm">
                                            <SmartWarning issues={image.warnings} />
                                        </div>
                                    )}
                                </>
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
                                <PixaRestoreIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" />
                            </div>
                            
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Old Photo</p>
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
                
                // Right: Controls
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm">
                                Restoration requires {cost} credits.
                            </p>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className="space-y-8 p-2 animate-fadeIn">
                            {/* Header */}
                            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                <div className="h-8 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Restoration Engine</h3>
                                    <p className="text-xs text-gray-400 font-medium">Select your preferred output style</p>
                                </div>
                            </div>

                            {/* Mode Selection */}
                            <div className="grid grid-cols-1 gap-4">
                                <ModeCard 
                                    title="Colour & Restore" 
                                    description="Repairs damage + AI Colorization. Best for black & white photos needing full revitalization." 
                                    icon={<PaletteIcon className="w-6 h-6"/>}
                                    selected={restoreMode === 'restore_color'}
                                    onClick={() => setRestoreMode('restore_color')}
                                    accentColor="text-purple-500"
                                />
                                <ModeCard 
                                    title="Restore Only" 
                                    description="Repairs damage while preserving original colors. Ideal for keeping the vintage aesthetic." 
                                    icon={<MagicWandIcon className="w-6 h-6"/>}
                                    selected={restoreMode === 'restore_only'}
                                    onClick={() => setRestoreMode('restore_only')}
                                    accentColor="text-blue-500"
                                />
                            </div>
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
            
            {/* Magic Editor Modal */}
            {showMagicEditor && resultImage && (
                <MagicEditorModal 
                    imageUrl={resultImage} 
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
]]></content>
</change>