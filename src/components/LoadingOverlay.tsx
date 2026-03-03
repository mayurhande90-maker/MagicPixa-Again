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
    gradient = "from-blue-500 to-purple-600",
    className = ""
}) => {
    if (!isVisible) return null;

    const isSimulated = progress === undefined;

    return (
        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn ${className}`}>
            {/* Percentage Ring */}
            <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                <svg className="w-full h-full transform -rotate-90">
                    {/* Background Circle */}
                    <circle
                        cx="48" cy="48" r="40"
                        stroke="currentColor" strokeWidth="6"
                        fill="transparent" className="text-white/10"
                    />
                    {/* Progress Stroke */}
                    <circle
                        cx="48" cy="48" r="40"
                        stroke="url(#ring-gradient)" strokeWidth="6"
                        fill="transparent"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * (progress || 0)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                    />
                    <defs>
                        <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                    </defs>
                </svg>
                <span className="absolute text-xl font-black text-white">
                    {Math.round(progress || 0)}%
                </span>
            </div>

            <div className="w-64 h-3 bg-gray-800/50 rounded-full overflow-hidden shadow-inner mb-4 relative border border-white/5">
                {/* Moving Gradient Layer */}
                <div 
                    className="h-full absolute inset-0 animate-move-gradient"
                    style={{ 
                        width: '100%',
                        backgroundImage: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6)',
                        backgroundSize: '200% 100%'
                    }}
                ></div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse text-center px-6">
                    {loadingText}
                </p>
            </div>
            
            <style>{`
                @keyframes move-gradient {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
                .animate-move-gradient {
                    animation: move-gradient 3s linear infinite;
                }
            `}</style>
        </div>
    );
};
