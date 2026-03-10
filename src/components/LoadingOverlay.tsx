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
    progress = 0,
    gradient = "from-blue-500 to-purple-600",
    className = ""
}) => {
    if (!isVisible) return null;

    const displayProgress = Math.round(progress);
    
    // Technical Sub-Step Sequencing
    const getStepText = () => {
        if (progress < 20) return "Initializing Neural Engine...";
        if (progress < 50) return "Synthesizing Visual Geometry...";
        if (progress < 85) return "Refining Lighting & Textures...";
        if (progress < 100) return "Finalizing High-Fidelity Export...";
        return "Masterpiece Ready!";
    };

    const activeText = loadingText.includes("Generating") || loadingText.includes("Processing") || loadingText === "Architecting High-Fidelity Assets..."
        ? getStepText() 
        : loadingText;

    return (
        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn ${className}`}>
            {/* Pro Progress Unit with Breathing Animation */}
            <div className="relative flex flex-col items-center animate-pro-breathe">
                
                {/* Orbiting Data Particles */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full blur-[1px] shadow-[0_0_8px_#60a5fa] animate-orbit-1"></div>
                    <div className="absolute top-0 left-1/2 w-1 h-1 bg-purple-400 rounded-full blur-[1px] shadow-[0_0_8px_#c084fc] animate-orbit-2"></div>
                    <div className="absolute top-0 left-1/2 w-2 h-2 bg-indigo-400 rounded-full blur-[1px] shadow-[0_0_10px_#818cf8] animate-orbit-3"></div>
                </div>

                {/* Luminous Conic Ring */}
                <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                    {/* Background Glow */}
                    <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-2xl animate-pulse"></div>
                    
                    {/* The Conic Ring */}
                    <div 
                        className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                        style={{
                            background: `conic-gradient(from 0deg, #3b82f6, #8b5cf6, #3b82f6 ${progress}%, transparent 0%)`,
                            WebkitMaskImage: 'radial-gradient(transparent 62%, black 64%)',
                            maskImage: 'radial-gradient(transparent 62%, black 64%)',
                            transition: 'background 0.3s ease-out'
                        }}
                    ></div>

                    {/* Inner Glass Circle */}
                    <div className="absolute inset-[10%] rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex flex-col items-center justify-center shadow-inner">
                        <span className="text-3xl font-black text-white tracking-tighter drop-shadow-md">
                            {displayProgress}<span className="text-sm opacity-50 ml-0.5">%</span>
                        </span>
                    </div>
                </div>

                {/* Technical Milestone Text */}
                <div className="flex flex-col items-center gap-4 max-w-xs">
                    <p className="text-[13px] font-[900] text-white uppercase tracking-[0.3em] animate-pulse text-center drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        {activeText}
                    </p>
                    
                    {/* Traveling Gradient Progress Bar */}
                    <div className="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/10 relative">
                        <div 
                            className="absolute top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-traveling-bar"
                        ></div>
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes pro-breathe {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.03); }
                }
                @keyframes traveling-bar {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }
                @keyframes orbit-1 {
                    from { transform: rotate(0deg) translateX(70px) rotate(0deg); }
                    to { transform: rotate(360deg) translateX(70px) rotate(-360deg); }
                }
                @keyframes orbit-2 {
                    from { transform: rotate(120deg) translateX(85px) rotate(-120deg); }
                    to { transform: rotate(480deg) translateX(85px) rotate(-480deg); }
                }
                @keyframes orbit-3 {
                    from { transform: rotate(240deg) translateX(60px) rotate(-240deg); }
                    to { transform: rotate(600deg) translateX(60px) rotate(-600deg); }
                }
                .animate-pro-breathe {
                    animation: pro-breathe 4s ease-in-out infinite;
                }
                .animate-traveling-bar {
                    animation: traveling-bar 2s linear infinite;
                }
                .animate-orbit-1 {
                    animation: orbit-1 6s linear infinite;
                }
                .animate-orbit-2 {
                    animation: orbit-2 8s linear infinite;
                }
                .animate-orbit-3 {
                    animation: orbit-3 10s linear infinite;
                }
            `}</style>
        </div>
    );
};
