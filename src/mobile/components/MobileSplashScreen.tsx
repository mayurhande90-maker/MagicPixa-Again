import React, { useEffect, useState } from 'react';

interface MobileSplashScreenProps {
    onComplete: () => void;
}

export const MobileSplashScreen: React.FC<MobileSplashScreenProps> = ({ onComplete }) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        // Professional duration: long enough to feel premium, short enough to be efficient
        const timer = setTimeout(() => {
            setIsClosing(true);
            setTimeout(onComplete, 1000); // Wait for the high-fidelity blur dissolve
        }, 3200);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-center overflow-hidden transition-all duration-1000 ease-in-out ${isClosing ? 'opacity-0 backdrop-blur-xl scale-105 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Living Canvas: Subtle ambient lighting */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(77,124,255,0.03)_0%,rgba(255,255,255,1)_70%)] animate-ambient-glow"></div>
            
            {/* Logo Core: Perfectly Centered */}
            <div className="relative flex flex-col items-center">
                <div className="flex items-center justify-center animate-aperture-bloom">
                    <h1 className="text-4xl font-logo font-black tracking-tighter flex items-center">
                        {/* Removed px-0.5 to ensure text is flush */}
                        <span className="text-[#1A1A1E] animate-kerning-flow">
                            Magic
                        </span>
                        {/* Removed ml-1 and px-0.5 to join the words */}
                        <span className="relative overflow-hidden rounded-sm">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 bg-[length:200%_auto] animate-light-sweep">
                                Pixa
                            </span>
                        </span>
                    </h1>
                </div>

                {/* Refined Loading Trace: Minimalist 1px line */}
                <div className="mt-12 w-32 h-[1px] bg-gray-100 relative overflow-hidden rounded-full opacity-0 animate-trace-reveal">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400 to-transparent w-1/2 animate-loading-trace"></div>
                </div>
            </div>

            <style>{`
                @keyframes ambient-glow {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.1); }
                }

                @keyframes aperture-bloom {
                    0% { 
                        opacity: 0; 
                        filter: blur(12px); 
                        transform: scale(0.94); 
                    }
                    20% { opacity: 1; }
                    100% { 
                        opacity: 1; 
                        filter: blur(0px); 
                        transform: scale(1); 
                    }
                }

                @keyframes kerning-flow {
                    0% { letter-spacing: 0.4em; opacity: 0; }
                    100% { letter-spacing: -0.05em; opacity: 1; }
                }

                @keyframes light-sweep {
                    0% { background-position: 200% center; }
                    100% { background-position: -200% center; }
                }

                @keyframes trace-reveal {
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                @keyframes loading-trace {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }

                .animate-ambient-glow {
                    animation: ambient-glow 8s ease-in-out infinite;
                }

                .animate-aperture-bloom {
                    animation: aperture-bloom 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .animate-kerning-flow {
                    animation: kerning-flow 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .animate-light-sweep {
                    animation: light-sweep 3s linear infinite;
                    animation-delay: 1.2s;
                }

                .animate-trace-reveal {
                    animation: trace-reveal 1s ease-out forwards;
                    animation-delay: 1.5s;
                }

                .animate-loading-trace {
                    animation: loading-trace 2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
                }
            `}</style>
        </div>
    );
};
