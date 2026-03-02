import React from 'react';

interface LoadingOverlayProps {
    isVisible: boolean;
    loadingText: string;
    progress?: number; // Optional progress percentage (0-100)
    gradient?: string;
    className?: string;
}

/**
 * Shared Loading Overlay component for AI generation features.
 * Provides a consistent animation and progress bar across the app.
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
    isVisible, 
    loadingText, 
    progress,
    gradient = "from-blue-400 to-purple-500",
    className = ""
}) => {
    if (!isVisible) return null;

    const isSimulated = progress === undefined;

    return (
        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn ${className}`}>
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4 relative">
                <div 
                    className={`h-full bg-gradient-to-r ${gradient} ${isSimulated ? 'animate-[progress_2s_ease-in-out_infinite]' : 'transition-all duration-500'}`}
                    style={!isSimulated ? { width: `${progress}%` } : {}}
                ></div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse text-center px-6">
                    {loadingText}
                </p>
                {!isSimulated && (
                    <span className="text-[10px] font-black text-white/60 tracking-tighter bg-white/10 px-2 py-0.5 rounded-full">
                        {Math.round(progress)}% COMPLETE
                    </span>
                )}
            </div>
            
            <style>{`
                @keyframes progress {
                    0% { width: 0%; margin-left: 0; }
                    50% { width: 100%; margin-left: 0; }
                    100% { width: 0%; margin-left: 100%; }
                }
            `}</style>
        </div>
    );
};
