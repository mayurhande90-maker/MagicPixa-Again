
import React, { useState } from 'react';
import { 
    SparklesIcon, 
    DownloadIcon, 
    TrashIcon, 
    RegenerateIcon, 
    UploadIcon, 
    XIcon,
    CheckIcon
} from './icons';
import { downloadImage } from '../utils/imageUtils';

export const InputField: React.FC<any> = ({ label, id, ...props }) => (
    <div className="mb-6">
        {label && <label htmlFor={id} className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>}
        <input id={id} className="w-full px-5 py-4 bg-white border-2 border-gray-100 hover:border-gray-300 focus:border-[#4D7CFF] rounded-2xl outline-none transition-all font-medium text-[#1A1A1E] placeholder-gray-400" {...props} />
    </div>
);

export const TextAreaField: React.FC<any> = ({ label, id, ...props }) => (
    <div className="mb-6">
        {label && <label htmlFor={id} className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>}
        <textarea id={id} className="w-full px-5 py-4 bg-white border-2 border-gray-100 hover:border-gray-300 focus:border-[#4D7CFF] rounded-2xl outline-none transition-all font-medium text-[#1A1A1E] placeholder-gray-400 resize-none" rows={4} {...props} />
    </div>
);

// Visual Selector for Prompt-Less UI - Premium Card Style
export const VisualSelector: React.FC<{ 
    label: string; 
    options: { id: string; label: string; color?: string }[]; 
    selected: string; 
    onSelect: (id: string) => void; 
}> = ({ label, options, selected, onSelect }) => (
    <div className="mb-8">
        <div className="flex items-center justify-between mb-3 ml-1">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
             <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-bold tracking-wide">REQUIRED</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
            {options.map(opt => {
                const isSelected = selected === opt.id;
                return (
                    <button 
                        key={opt.id} 
                        onClick={() => onSelect(opt.id)}
                        className={`relative group overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 border-2 ${
                            isSelected 
                            ? 'border-[#4D7CFF] bg-[#4D7CFF]/5 shadow-md' 
                            : 'border-transparent bg-white hover:bg-gray-50 hover:border-gray-200'
                        }`}
                    >
                        <div className={`w-full h-full flex flex-col justify-between gap-3`}>
                            <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-[#4D7CFF]' : 'bg-gray-300 group-hover:bg-gray-400'} transition-colors duration-300`}></div>
                            <span className={`font-bold text-sm ${isSelected ? 'text-[#1A1A1E]' : 'text-gray-500 group-hover:text-gray-700'} transition-colors duration-300`}>{opt.label}</span>
                        </div>
                    </button>
                )
            })}
        </div>
    </div>
);

export const SelectionGrid: React.FC<{ label: string; options: string[]; value: string; onChange: (val: string) => void }> = ({ label, options, value, onChange }) => (
    <div className="mb-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-3 ml-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
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
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-300 transform active:scale-95 ${
                            isSelected 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm'
                        }`}
                    >
                        {opt}
                    </button>
                )
            })}
        </div>
    </div>
);

export const ImageModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6" onClick={onClose}>
        <div className="relative w-full h-full flex items-center justify-center">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"><XIcon className="w-8 h-8" /></button>
            <img src={imageUrl} alt="Full view" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
        </div>
    </div>
);

export const MilestoneSuccessModal: React.FC<{ onClose: () => void; bonus?: number }> = ({ onClose, bonus = 5 }) => {
    const [isClaimed, setIsClaimed] = useState(false);

    const handleClaim = () => {
        setIsClaimed(true);
        setTimeout(() => {
            onClose();
        }, 2500); // Allow user to see the success state for 2.5 seconds
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
    customActionButtons?: React.ReactNode; // New prop for additional action buttons
}> = ({ 
    title, icon, leftContent, rightContent, onGenerate, isGenerating, canGenerate, 
    creditCost, resultImage, onResetResult, onNewSession, description,
    generateButtonStyle, resultHeightClass, hideGenerateButton,
    disableScroll, scrollRef, resultOverlay, customActionButtons
}) => {
    const [isZoomed, setIsZoomed] = useState(false);
    
    // Default height if not specified. Used to enforce alignment.
    const contentHeightClass = resultHeightClass || 'h-[560px]';

    return (
        <div className="flex flex-col p-6 lg:p-8 max-w-[1800px] mx-auto bg-[#FFFFFF]">
            {/* Header */}
            <div className="mb-5 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                        {icon}
                    </div>
                    <h1 className="text-2xl font-bold text-[#1A1A1E]">{title}</h1>
                </div>
                {description && <p className="text-sm text-gray-500 font-medium max-w-2xl">{description}</p>}
            </div>

            {/* Main Content Grid */}
            {/* 50/50 Split for equal sizing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LEFT COLUMN: Upload / Preview / Result Canvas */}
                <div className={`w-full flex flex-col justify-start ${contentHeightClass}`}>
                    {resultImage ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] rounded-3xl relative animate-fadeIn overflow-hidden shadow-inner group">
                             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 to-[#1a1a1a] opacity-50"></div>
                             <img 
                                src={resultImage} 
                                className="w-full h-full object-contain shadow-2xl relative z-10 cursor-zoom-in transition-transform duration-300 hover:scale-[1.01]" 
                                onClick={() => setIsZoomed(true)}
                                title="Click to zoom"
                             />
                             
                             {/* Custom Result Overlay (e.g., Status badges, optional) */}
                             {resultOverlay && (
                                 <div className="absolute top-4 right-4 z-30">
                                     {resultOverlay}
                                 </div>
                             )}
                             
                             {/* Result Actions */}
                             <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none px-4">
                                <div className="pointer-events-auto flex gap-2 sm:gap-3 flex-wrap justify-center">
                                    {/* Inject Custom Buttons First or Last based on preference. Here first for visibility. */}
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
                <div className={`flex flex-col ${contentHeightClass}`}>
                    <div className="bg-[#F6F7FA] p-5 rounded-3xl flex-1 flex-col h-full border border-gray-100 overflow-hidden flex">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Configuration</h3>
                            <div className="h-1 w-12 bg-gray-200 rounded-full"></div>
                        </div>
                        
                        {/* Scrollable Content Area */}
                        <div ref={scrollRef} className={`flex-1 ${disableScroll ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'} pr-1 flex flex-col relative`}>
                            {/* Conditional padding: remove extra padding if scrolling is disabled, ensuring full height for fixed layouts */}
                            <div className={`flex flex-col h-full justify-start ${disableScroll ? '' : 'pb-48'}`}>
                                {/* Content - ensure it takes full height if disableScroll is active to allow flexbox positioning */}
                                <div className={`flex-col ${disableScroll ? 'flex h-full' : 'space-y-2'}`}>
                                    {rightContent}
                                </div>
                            </div>
                        </div>

                        {/* Fixed Footer for Generate Button (Only if not hidden) */}
                        {!hideGenerateButton && (
                            <div className="pt-6 border-t border-gray-200 bg-[#F6F7FA] flex-shrink-0 z-10">
                                <button 
                                    onClick={onGenerate} 
                                    disabled={isGenerating || !canGenerate}
                                    className={`group w-full text-lg font-bold py-4 rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-3 active:scale-95 ${
                                        generateButtonStyle?.className 
                                        ? generateButtonStyle.className 
                                        : "bg-[#F9D230] hover:bg-[#dfbc2b] text-[#1A1A1E] shadow-yellow-500/20 hover:shadow-yellow-500/40"
                                    }`}
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
                                <div className="text-center mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                    {creditCost === 0 ? (
                                            <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1 rounded-full border border-green-100">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
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

// Helper to check milestone status based on new non-linear logic
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
