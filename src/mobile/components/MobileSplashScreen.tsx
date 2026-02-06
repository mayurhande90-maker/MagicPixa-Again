import React, { useEffect, useState } from 'react';
import { SparklesIcon } from '../../components/icons';

interface MobileSplashScreenProps {
    onComplete: () => void;
}

export const MobileSplashScreen: React.FC<MobileSplashScreenProps> = ({ onComplete }) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        // Total duration of the animation sequence before starting the exit
        const timer = setTimeout(() => {
            setIsClosing(true);
            // Allow exit animation to finish
            setTimeout(onComplete, 800);
        }, 2800);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ease-in-out ${isClosing ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100'}`}>
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 opacity-0 animate-fade-in-slow"></div>
            
            {/* Logo Container */}
            <div className="relative flex items-center justify-center scale-150 sm:scale-[2]">
                {/* "Magic" Text */}
                <span className="text-4xl font-logo font-black text-[#1A1A1E] opacity-0 animate-magic-entrance tracking-tighter">
                    Magic
                </span>
                
                {/* "Pixa" Text */}
                <span className="text-4xl font-logo font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 animate-pixa-entrance tracking-tighter ml-1">
                    Pixa
                </span>

                {/* Final Sparkle Overlay */}
                <div className="absolute -top-6 -right-6 opacity-0 animate-sparkle-pop">
                    <SparklesIcon className="w-8 h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                </div>

                {/* Subtle Glow behind the logo */}
                <div className="absolute inset-0 bg-blue-400/10 blur-3xl rounded-full scale-150 opacity-0 animate-glow-pulse"></div>
            </div>

            {/* Bottom Status */}
            <div className="absolute bottom-20 flex flex-col items-center gap-3 opacity-0 animate-status-fade">
                <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-200 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Initializing Studio</p>
            </div>

            <style>{`
                @keyframes magic-entrance {
                    0% { opacity: 0; transform: translateX(-30px) scale(0.9); filter: blur(10px); }
                    100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
                }
                @keyframes pixa-entrance {
                    0% { opacity: 0; transform: translateY(20px) scale(1.2); }
                    60% { transform: translateY(-5px) scale(1.05); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes sparkle-pop {
                    0% { opacity: 0; transform: scale(0) rotate(-45deg); }
                    70% { opacity: 1; transform: scale(1.3) rotate(10deg); }
                    100% { opacity: 1; transform: scale(1) rotate(0deg); }
                }
                @keyframes glow-pulse {
                    0%, 100% { opacity: 0; transform: scale(1); }
                    50% { opacity: 0.3; transform: scale(1.8); }
                }
                @keyframes status-fade {
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-slow {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }

                .animate-magic-entrance {
                    animation: magic-entrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    animation-delay: 0.3s;
                }
                .animate-pixa-entrance {
                    animation: pixa-entrance 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    animation-delay: 0.8s;
                }
                .animate-sparkle-pop {
                    animation: sparkle-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    animation-delay: 1.6s;
                }
                .animate-glow-pulse {
                    animation: glow-pulse 2s ease-in-out infinite;
                    animation-delay: 1.8s;
                }
                .animate-status-fade {
                    animation: status-fade 1s ease-out forwards;
                    animation-delay: 2s;
                }
                .animate-fade-in-slow {
                    animation: fade-in-slow 1.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
