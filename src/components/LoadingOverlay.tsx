import React from 'react';

interface LoadingOverlayProps {
    isVisible: boolean;
    loadingText: string;
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
    gradient = "from-blue-400 to-purple-500",
    className = ""
}) => {
    if (!isVisible) return null;

    return (
        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn ${className}`}>
            <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                <div className={`h-full bg-gradient-to-r ${gradient} animate-[progress_2s_ease-in-out_infinite] rounded-full`}></div>
            </div>
            <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse text-center px-6">
                {loadingText}
            </p>
            
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
