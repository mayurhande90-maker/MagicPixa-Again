
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
    CheckIcon
} from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { colourizeImage } from '../services/imageToolsService';
import { saveCreation, deductCredits } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';

// Helper Card for Mode Selection (Consistent with other premium features)
const ModeCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
    color: 'blue' | 'purple';
}> = ({ title, description, icon, selected, onClick, color }) => {
    
    // Static mapping for colors
    const colorStyles = {
        blue: {
            selected: 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-200',
            hover: 'hover:border-blue-200 hover:bg-gray-50',
            iconSelected: 'text-blue-600',
            textSelected: 'text-blue-900',
            descSelected: 'text-blue-700',
            badge: 'bg-blue-500'
        },
        purple: {
            selected: 'border-purple-500 bg-purple-50 shadow-md ring-1 ring-purple-200',
            hover: 'hover:border-purple-200 hover:bg-gray-50',
            iconSelected: 'text-purple-600',
            textSelected: 'text-purple-900',
            descSelected: 'text-purple-700',
            badge: 'bg-purple-500'
        }
    };

    const currentStyle = colorStyles[color];

    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all w-full group relative overflow-hidden text-center h-40 ${
                selected 
                ? currentStyle.selected
                : `border-gray-100 bg-white ${currentStyle.hover}`
            }`}
        >
            <div className={`mb-3 p-3 rounded-full transition-transform group-hover:scale-110 ${selected ? 'bg-white/80' : 'bg-gray-50'} ${selected ? currentStyle.iconSelected : `text-gray-400`}`}>
                {icon}
            </div>
            <h3 className={`font-bold text-sm mb-1 ${selected ? currentStyle.textSelected : 'text-gray-700'}`}>{title}</h3>
            <p className={`text-[10px] ${selected ? currentStyle.descSelected : 'text-gray-400'}`}>{description}</p>
            
            {/* Checkmark for selected */}
            {selected && (
                <div className={`absolute top-2 right-2 text-white p-0.5 rounded-full ${currentStyle.badge}`}>
                    <CheckIcon className="w-3 h-3" />
                </div>
            )}
        </button>
    );
};

export const PixaPhotoRestore: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // State
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [restoreMode, setRestoreMode] = useState<'restore_color' | 'restore_only' | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

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

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
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
                setImage({ url: URL.createObjectURL(file), base64 });
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

        try {
            const res = await colourizeImage(
                image.base64.base64,
                image.base64.mimeType,
                restoreMode
            );

            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            saveCreation(auth.user.uid, dataUri, 'Pixa Photo Restore');
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

    const handleNewSession = () => {
        setImage(null);
        setResultImage(null);
        setRestoreMode(null);
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
                description="Breathe new life into vintage photos. Restore details, fix scratches, and optionally colorize."
                icon={<PixaRestoreIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                onResetResult={handleGenerate} 
                onNewSession={handleNewSession}
                resultHeightClass="h-[750px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Begin Restoration"
                }}
                scrollRef={scrollRef}
                customActionButtons={
                    resultImage ? (
                        <button onClick={() => setShowMagicEditor(true)} className="bg-[#4D7CFF] hover:bg-[#3b63cc] text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transform hover:scale-105 whitespace-nowrap">
                            <MagicWandIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white"/> <span>Magic Editor</span>
                        </button>
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
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"
                                    title="Change Image"
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
                                <CameraIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" />
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
                        <div className="space-y-8 p-1 animate-fadeIn">
                            {/* Mode Selection */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block ml-1">Select Restoration Type</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <ModeCard 
                                        title="Colour & Restore" 
                                        description="Fix damage + Auto-Colorize" 
                                        icon={<PaletteIcon className="w-8 h-8"/>}
                                        selected={restoreMode === 'restore_color'}
                                        onClick={() => setRestoreMode('restore_color')}
                                        color="purple"
                                    />
                                    <ModeCard 
                                        title="Only Restore" 
                                        description="Keep B&W / Sepia + Fix Damage" 
                                        icon={<MagicWandIcon className="w-8 h-8"/>}
                                        selected={restoreMode === 'restore_only'}
                                        onClick={() => setRestoreMode('restore_only')}
                                        color="blue"
                                    />
                                </div>
                            </div>

                            {/* Informational Blurb */}
                            {restoreMode && (
                                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 animate-fadeIn">
                                    <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                        <SparklesIcon className="w-4 h-4 text-indigo-500"/> 
                                        {restoreMode === 'restore_color' ? 'Full Restoration Engine' : 'Classic Restoration Engine'}
                                    </h4>
                                    <p className="text-xs text-indigo-700/80 leading-relaxed mb-3">
                                        {restoreMode === 'restore_color' 
                                            ? "Pixa will analyze the clothing and background context to apply historically accurate colors while repairing physical damage."
                                            : "Pixa will focus strictly on denoising, sharpening, and repairing physical damage while preserving the original monochromatic mood."}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-white/60 p-2 rounded-lg inline-block">
                                        <CheckIcon className="w-3 h-3"/> Identity Lock Active
                                    </div>
                                </div>
                            )}
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
        </>
    );
};
