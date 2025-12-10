
import React, { useState, useEffect } from 'react';
import { 
    SparklesIcon, 
    DownloadIcon, 
    TrashIcon, 
    RegenerateIcon, 
    UploadIcon, 
    XIcon,
    CheckIcon,
    ChevronLeftRightIcon,
    ArrowLeftIcon,
    ChevronRightIcon,
    ThumbUpIcon,
    ThumbDownIcon
} from './icons';
import { downloadImage } from '../utils/imageUtils';
import { submitFeedback, auth } from '../firebase';
import { FeatureStyles } from '../styles/FeatureLayout.styles.ts';

export const InputField: React.FC<any> = ({ label, id, ...props }) => (
    <div className="mb-6">
        {label && <label htmlFor={id} className={FeatureStyles.inputLabel}>{label}</label>}
        <input id={id} className={FeatureStyles.inputField} {...props} />
    </div>
);

export const TextAreaField: React.FC<any> = ({ label, id, ...props }) => (
    <div className="mb-6">
        {label && <label htmlFor={id} className={FeatureStyles.inputLabel}>{label}</label>}
        <textarea id={id} className={`${FeatureStyles.inputField} resize-none`} rows={4} {...props} />
    </div>
);

export const SelectionGrid: React.FC<{ label: string; options: string[]; value: string; onChange: (val: string) => void }> = ({ label, options, value, onChange }) => (
    <div className={FeatureStyles.selectionContainer}>
        <div className="flex items-center justify-between mb-3 ml-1">
            <label className={FeatureStyles.inputLabel}>{label}</label>
            {value && (
                 <button onClick={() => onChange('')} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">
                     Clear
                 </button>
            )}
        </div>
        <div className="flex flex-wrap gap-2">
            {options.map(opt => {
                const isSelected = value === opt;
                return (
                    <button 
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`${FeatureStyles.selectionButton} ${isSelected ? FeatureStyles.selectionButtonActive : FeatureStyles.selectionButtonInactive}`}
                    >
                        {opt}
                    </button>
                )
            })}
        </div>
    </div>
);

export const ImageModal: React.FC<{ 
    imageUrl: string; 
    onClose: () => void;
    onDownload?: () => void;
    onDelete?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
}> = ({ imageUrl, onClose, onDownload, onDelete, onNext, onPrev, hasNext, hasPrev }) => {
    
    // Keyboard navigation support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' && onNext && hasNext) {
                onNext();
            } else if (e.key === 'ArrowLeft' && onPrev && hasPrev) {
                onPrev();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNext, onPrev, hasNext, hasPrev, onClose]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6" onClick={onClose}>
            <div className="relative w-full h-full flex items-center justify-center">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 z-50"><XIcon className="w-8 h-8" /></button>
                
                {/* Navigation Buttons */}
                {hasPrev && onPrev && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onPrev(); }} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 p-3 rounded-full transition-all z-50"
                        title="Previous Image (Left Arrow)"
                    >
                        <ArrowLeftIcon className="w-8 h-8" />
                    </button>
                )}
                
                {hasNext && onNext && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onNext(); }} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 p-3 rounded-full transition-all z-50"
                        title="Next Image (Right Arrow)"
                    >
                        <ChevronRightIcon className="w-8 h-8" />
                    </button>
                )}

                <img src={imageUrl} alt="Full view" className="max-w-full max-h-[calc(100vh-150px)] rounded-lg shadow-2xl object-contain animate-fadeIn" onClick={(e) => e.stopPropagation()} />
                
                {/* Bottom Action Bar */}
                {(onDownload || onDelete) && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50" onClick={(e) => e.stopPropagation()}>
                        {onDownload && (
                            <button onClick={onDownload} className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-lg hover:scale-105 transform">
                                <DownloadIcon className="w-5 h-5"/> Download
                            </button>
                        )}
                        {onDelete && (
                            <button onClick={onDelete} className="bg-red-500/20 hover:bg-red-500/30 text-red-50 border border-red-500/50 px-6 py-3 rounded-full font-bold transition-colors flex items-center gap-2 backdrop-blur-md hover:scale-105 transform">
                                <TrashIcon className="w-5 h-5"/> Delete
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const MilestoneSuccessModal: React.FC<{ onClose: () => void; bonus?: number }> = ({ onClose, bonus = 5 }) => {
    const [isClaimed, setIsClaimed] = useState(false);

    const handleClaim = () => {
        setIsClaimed(true);
        setTimeout(() => {
            onClose();
        }, 2500); 
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
             <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center transform animate-bounce-slight text-white border border-white/10" onClick={e => e.stopPropagation()}>
                 {!isClaimed ? (
                     <div className="animate-fadeIn">
                         <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                             <SparklesIcon className="w-10 h-10 text-yellow-300 animate-spin-slow" />
                         </div>
                         
                         <h2 className="text-2xl font-bold mt-4 mb-2">Milestone Reached!</h2>
                         <p className="text-indigo-100 mb-6 text-sm leading-relaxed">
                             You've hit a new creation record. Here is a reward for your creativity.
                         </p>
                         
                         <div className="bg-white/20 backdrop-blur-md text-white font-black text-4xl py-6 rounded-2xl mb-6 border border-white/30 shadow-inner">
                             +{bonus} <span className="text-lg font-bold opacity-80">Credits</span>
                         </div>
                         
                         <button 
                            onClick={handleClaim} 
                            className="w-full bg-white text-indigo-600 font-bold py-3.5 rounded-xl hover:bg-indigo-50 transition-all shadow-lg hover:scale-[1.02] active:scale-95"
                         >
                             Collect Bonus
                         </button>
                     </div>
                 ) : (
                     <div className="animate-[fadeInUp_0.5s_ease-out]">
                         <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_#22c55e] animate-[bounce_1s_infinite]">
                             <CheckIcon className="w-10 h-10 text-white" />
                         </div>
                         
                         <h2 className="text-3xl font-bold mb-2 text-white">Bonus Credited!</h2>
                         <p className="text-indigo-200 text-sm mb-6">Added to your account balance</p>
                         
                         <div className="scale-110 transition-transform duration-500">
                             <div className="inline-block bg-white/20 backdrop-blur-md text-[#6EFACC] font-black text-5xl px-8 py-4 rounded-2xl border border-[#6EFACC]/50 shadow-[0_0_20px_rgba(110,250,204,0.4)]">
                                 +{bonus}
                             </div>
                         </div>
                     </div>
                 )}
             </div>
        </div>
    );
};

export const UploadPlaceholder: React.FC<{ label: string; onClick: () => void; icon?: React.ReactNode }> = ({ label, onClick, icon }) => (
    <div 
        onClick={onClick}
        className="w-full h-full border-2 border-dashed border-gray-300 hover:border-[#4D7CFF] bg-white rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden hover:-translate-y-1 hover:shadow-md"
    >
        <div className="relative z-10 p-6 bg-gray-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
            {icon || <UploadIcon className="w-12 h-12 text-gray-400 group-hover:text-[#4D7CFF] transition-colors duration-300" />}
        </div>
        
        <div className="relative z-10 mt-6 text-center space-y-2 px-6">
            <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">{label}</p>
            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest group-hover:text-[#4D7CFF] transition-colors delay-75 bg-gray-50 px-3 py-1 rounded-full">Click to Browse</p>
        </div>
    </div>
);

// Improved Sparkle Animation Component
const FeedbackSparkle = () => (
  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
    <div className="absolute animate-[ping_0.5s_ease-out_forwards] text-yellow-300 opacity-90 scale-150">✨</div>
    <div className="absolute -top-6 -right-6 text-yellow-200 w-4 h-4 animate-[bounce_0.6s_infinite]">✦</div>
    <div className="absolute -bottom-4 -left-6 text-yellow-400 w-3 h-3 animate-[pulse_0.4s_infinite]">★</div>
    <div className="absolute top-0 left-0 w-full h-full border-2 border-yellow-300 rounded-full animate-[ping_0.6s_ease-out_forwards] opacity-60"></div>
    {/* Burst Lines */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div 
            key={deg}
            className="absolute w-1 h-2 bg-yellow-400 rounded-full opacity-0 animate-[ping_0.4s_ease-out_forwards]"
            style={{ 
                transform: `rotate(${deg}deg) translateY(-20px)`,
                animationDelay: '0.1s'
            }} 
        />
    ))}
  </div>
);

export const FeatureLayout: React.FC<{
    title: string;
    icon: React.ReactNode;
    leftContent: React.ReactNode;
    rightContent: React.ReactNode;
    onGenerate: () => void;
    isGenerating: boolean;
    canGenerate: boolean;
    creditCost: number;
    resultImage: string | null;
    creationId?: string | null;
    onResetResult?: () => void;
    onNewSession?: () => void;
    description?: string;
    generateButtonStyle?: {
        className?: string;
        hideIcon?: boolean;
        label?: string;
    };
    resultHeightClass?: string;
    hideGenerateButton?: boolean;
    disableScroll?: boolean;
    scrollRef?: React.RefObject<HTMLDivElement>;
    resultOverlay?: React.ReactNode;
    customActionButtons?: React.ReactNode;
    rawIcon?: boolean; 
}> = ({ 
    title, icon, leftContent, rightContent, onGenerate, isGenerating, canGenerate, 
    creditCost, resultImage, creationId, onResetResult, onNewSession, description,
    generateButtonStyle, resultHeightClass, hideGenerateButton,
    disableScroll, scrollRef, resultOverlay, customActionButtons, rawIcon
}) => {
    const [isZoomed, setIsZoomed] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
    const [animatingFeedback, setAnimatingFeedback] = useState<'up' | 'down' | null>(null);
    const [showThankYou, setShowThankYou] = useState(false);
    const [isFeedbackLocked, setIsFeedbackLocked] = useState(false);
    
    const contentHeightClass = resultHeightClass || 'h-[560px]';

    useEffect(() => {
        // Reset Feedback UI when a new image is loaded
        setFeedbackGiven(null);
        setShowThankYou(false);
        setIsFeedbackLocked(false);
        setAnimatingFeedback(null);
    }, [resultImage]);

    const handleFeedback = async (type: 'up' | 'down') => {
        if (isFeedbackLocked || animatingFeedback) return;

        setIsFeedbackLocked(true);
        setAnimatingFeedback(type); // Triggers sparkle and animation class (visual state)
        
        // Submit to backend immediately (Optimistic UI)
        if (auth?.currentUser) {
            try {
                submitFeedback(
                    auth.currentUser.uid, 
                    creationId || null, 
                    type, 
                    title, 
                    resultImage,
                    auth.currentUser.email || '',
                    auth.currentUser.displayName || 'Unknown'
                );
            } catch (error) {
                console.error("Failed to submit feedback:", error);
            }
        }

        setTimeout(() => {
            setFeedbackGiven(type); 
            setAnimatingFeedback(null); 
            setShowThankYou(true);
            
            setTimeout(() => setShowThankYou(false), 3000);
        }, 3000); 
    };

    return (
        <div className={FeatureStyles.wrapper}>
            {/* Header */}
            <div className={FeatureStyles.header}>
                <div className={FeatureStyles.titleRow}>
                    {rawIcon ? (
                        <div className="transition-transform hover:scale-105">
                            {icon}
                        </div>
                    ) : (
                        <div className={FeatureStyles.iconContainer}>
                            {icon}
                        </div>
                    )}
                    <h1 className={FeatureStyles.titleText}>{title}</h1>
                </div>
                {description && <p className={FeatureStyles.description}>{description}</p>}
            </div>

            {/* Main Content Grid */}
            <div className={FeatureStyles.gridContainer}>
                
                {/* LEFT COLUMN: Upload / Preview / Result Canvas */}
                <div className={`${FeatureStyles.canvasContainer} ${contentHeightClass}`}>
                    {resultImage ? (
                        <div className={FeatureStyles.resultContainer}>
                             <div className={FeatureStyles.resultOverlay}></div>
                             <img 
                                src={resultImage} 
                                className={FeatureStyles.resultImage}
                                onClick={() => setIsZoomed(true)}
                                title="Click to zoom"
                             />
                             
                             {resultOverlay && (
                                 <div className="absolute top-4 right-4 z-30">
                                     {resultOverlay}
                                 </div>
                             )}

                             {/* Feedback UI - REPOSITIONED to Bottom Left with Label */}
                             <div className="absolute bottom-20 left-4 flex flex-col items-start gap-2 z-30 pointer-events-none">
                                {showThankYou && (
                                    <div className="pointer-events-auto animate-[fadeInUp_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)] bg-black/80 text-white text-xs font-bold px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-2xl mb-1 flex items-center gap-2 transform origin-bottom">
                                        <SparklesIcon className="w-4 h-4 text-yellow-300" /> 
                                        <span>Thank you for your feedback!</span>
                                    </div>
                                )}
                                
                                {/* Buttons Container - Only show if creationId exists to prevent broken admin links */}
                                {!feedbackGiven && creationId && (
                                    <>
                                        <span className="text-[10px] font-bold text-white/90 shadow-black/50 drop-shadow-md ml-1 bg-black/20 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">Do you like this result?</span>
                                        <div className={`pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-white/20 p-1.5 rounded-full flex gap-2 shadow-xl animate-fadeIn transition-all duration-300 hover:bg-black/90 ${animatingFeedback ? 'scale-105 ring-2 ring-white/20' : ''}`}>
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleFeedback('up'); }}
                                                className={`relative p-2 rounded-full transition-all duration-200 ${
                                                    animatingFeedback === 'up' 
                                                    ? 'bg-green-500 text-white scale-110 shadow-lg' 
                                                    : 'text-white/70 hover:bg-white/10 hover:text-white hover:scale-110'
                                                }`}
                                                title="Good Result"
                                            >
                                                <ThumbUpIcon className="w-5 h-5" />
                                                {animatingFeedback === 'up' && <FeedbackSparkle />}
                                            </button>
                                            
                                            <div className="w-px bg-white/10 my-1"></div>
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleFeedback('down'); }}
                                                className={`relative p-2 rounded-full transition-all duration-200 ${
                                                    animatingFeedback === 'down' 
                                                    ? 'bg-red-500 text-white scale-110 shadow-lg' 
                                                    : 'text-white/70 hover:bg-white/10 hover:text-white hover:scale-110'
                                                }`}
                                                title="Bad Result"
                                            >
                                                <ThumbDownIcon className="w-5 h-5" />
                                                {animatingFeedback === 'down' && <FeedbackSparkle />}
                                            </button>
                                        </div>
                                    </>
                                )}
                             </div>
                             
                             {/* Result Actions */}
                             <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none px-4">
                                <div className="pointer-events-auto flex gap-2 sm:gap-3 flex-wrap justify-center">
                                    {customActionButtons}

                                    {onNewSession && (
                                         <button onClick={onNewSession} className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap">
                                            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                                            <span className="hidden sm:inline">New Project</span>
                                        </button>
                                    )}
                                    {onResetResult && (
                                        <button onClick={onResetResult} className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap">
                                            <RegenerateIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                                            <span className="hidden sm:inline">Regenerate</span>
                                        </button>
                                    )}
                                    <button onClick={() => resultImage && downloadImage(resultImage, 'magicpixa-creation.png')} className="bg-[#F9D230] hover:bg-[#dfbc2b] text-[#1A1A1E] px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all shadow-lg shadow-yellow-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transform hover:scale-105 whitespace-nowrap">
                                        <DownloadIcon className="w-4 h-4 sm:w-5 sm:h-5"/> <span>Download</span>
                                    </button>
                                </div>
                             </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-start">
                            <div className="w-full h-full relative flex flex-col items-center">
                                {leftContent}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Control Deck */}
                <div className={`${FeatureStyles.controlsContainer} ${contentHeightClass}`}>
                    <div className={FeatureStyles.controlsBox}>
                        <div className={FeatureStyles.controlsHeader}>
                            <h3 className={FeatureStyles.controlsTitle}>Configuration</h3>
                            <div className="h-1 w-12 bg-gray-200 rounded-full"></div>
                        </div>
                        
                        <div ref={scrollRef} className={`${FeatureStyles.controlsScrollArea} ${disableScroll ? 'overflow-hidden' : ''}`}>
                            <div className={`flex flex-col h-full justify-start ${disableScroll ? '' : 'pb-48'}`}>
                                <div className={`flex-col ${disableScroll ? 'flex h-full' : 'space-y-2'}`}>
                                    {rightContent}
                                </div>
                            </div>
                        </div>

                        {!hideGenerateButton && (
                            <div className={FeatureStyles.actionArea}>
                                <button 
                                    onClick={onGenerate} 
                                    disabled={isGenerating || !canGenerate}
                                    className={`${FeatureStyles.generateButton} ${generateButtonStyle?.className}`}
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className={`w-6 h-6 border-3 border-t-transparent rounded-full animate-spin border-black/10 border-t-black`}></div> 
                                            <span className="animate-pulse">Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            {!generateButtonStyle?.hideIcon && <SparklesIcon className="w-6 h-6 transition-transform group-hover:rotate-12"/>}
                                            {generateButtonStyle?.label || "Generate"}
                                        </>
                                    )}
                                </button>
                                <div className={FeatureStyles.costBadge}>
                                    {creditCost === 0 ? (
                                            <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1 rounded-full border border-green-100">
                                                <span className="w-1.5 h-1.5 bg-green-50 rounded-full animate-pulse"></span>
                                                Sponsored by Daily Mission
                                            </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-gray-200">
                                            <span className="w-1.5 h-1.5 bg-[#6EFACC] rounded-full animate-pulse"></span>
                                            Cost: {creditCost} Credits
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isZoomed && resultImage && (
                <ImageModal imageUrl={resultImage} onClose={() => setIsZoomed(false)} />
            )}
        </div>
    );
};

export const checkMilestone = (gens: number): number | false => {
    if (gens > 0) {
        if (gens === 10) return 5;
        if (gens === 25) return 10;
        if (gens === 50) return 15;
        if (gens === 75) return 20;
        if (gens === 100) return 30;
        if (gens > 100 && gens % 100 === 0) return 30;
    }
    return false;
};
