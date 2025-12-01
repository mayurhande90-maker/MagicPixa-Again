import React from 'react';

interface PixaMascotProps {
    mode?: 'idle' | 'processing' | 'success' | 'error';
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const PixaMascot: React.FC<PixaMascotProps> = ({ mode = 'idle', className = '', size = 'md' }) => {
    // Sizes
    const sizeClasses = {
        sm: 'w-16 h-16',
        md: 'w-32 h-32',
        lg: 'w-48 h-48',
        xl: 'w-64 h-64'
    };

    // Animation Classes
    const getAnimationClass = () => {
        switch(mode) {
            case 'processing': return 'animate-pixa-thinking';
            case 'success': return 'animate-pixa-bounce';
            case 'error': return 'animate-pixa-shake';
            default: return 'animate-pixa-float';
        }
    };

    return (
        <div className={`relative flex flex-col items-center justify-center ${sizeClasses[size]} ${className}`}>
            
            {/* PIXA CHARACTER SVG */}
            <svg 
                viewBox="0 0 200 240" 
                className={`w-full h-full drop-shadow-2xl z-10 ${getAnimationClass()}`}
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* ANTENNA */}
                <g className="animate-antenna-wiggle origin-bottom">
                    <line x1="100" y1="40" x2="100" y2="15" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="100" cy="15" r="5" fill="#EF4444" />
                </g>

                {/* HEAD GROUP */}
                <g className="origin-center">
                    {/* Helmet/Head Shape */}
                    <path 
                        d="M40 100 C40 50, 160 50, 160 100 C160 140, 140 155, 100 155 C60 155, 40 140, 40 100" 
                        fill="white" 
                        stroke="#E2E8F0" 
                        strokeWidth="3"
                    />
                    
                    {/* Ear Pieces (Orange/Blue) */}
                    <circle cx="35" cy="100" r="12" fill="#3B82F6" stroke="#2563EB" strokeWidth="3"/>
                    <circle cx="35" cy="100" r="6" fill="#F97316"/>
                    <circle cx="165" cy="100" r="12" fill="#3B82F6" stroke="#2563EB" strokeWidth="3"/>
                    <circle cx="165" cy="100" r="6" fill="#F97316"/>

                    {/* Face Screen (Light Blue) */}
                    <path 
                        d="M55 100 C55 65, 145 65, 145 100 C145 130, 130 140, 100 140 C70 140, 55 130, 55 100" 
                        fill="#D1FAE5" // Light cyan/mint
                        stroke="#99F6E4" 
                        strokeWidth="2"
                    />

                    {/* Eyes (Animated Blink) */}
                    <g className="animate-pixa-blink origin-center">
                        {/* Left Eye */}
                        <ellipse cx="80" cy="95" rx="10" ry="14" fill="#1E3A8A" />
                        <circle cx="83" cy="90" r="3" fill="white" /> {/* Sparkle */}
                        
                        {/* Right Eye */}
                        <ellipse cx="120" cy="95" rx="10" ry="14" fill="#1E3A8A" />
                        <circle cx="123" cy="90" r="3" fill="white" /> {/* Sparkle */}
                    </g>

                    {/* Mouth */}
                    <path 
                        d="M90 120 Q100 128 110 120" 
                        stroke="#1E3A8A" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        fill="none"
                    />
                </g>

                {/* BODY GROUP */}
                <g transform="translate(0, 160)">
                    {/* Torso */}
                    <path 
                        d="M65 0 L135 0 L145 60 L55 60 Z" 
                        fill="white" 
                        stroke="#E2E8F0" 
                        strokeWidth="3"
                    />
                    
                    {/* Chest Logo/Screen */}
                    <rect x="80" y="15" width="40" height="25" rx="5" fill="#3B82F6" />
                    <text x="100" y="32" fontSize="10" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="sans-serif">PIXA</text>

                    {/* Arms */}
                    <path d="M60 10 Q40 20 45 40" stroke="#3B82F6" strokeWidth="10" strokeLinecap="round" fill="none" />
                    <path d="M140 10 Q160 20 155 40" stroke="#3B82F6" strokeWidth="10" strokeLinecap="round" fill="none" />
                    
                    {/* Legs */}
                    <path d="M75 60 L70 80" stroke="white" strokeWidth="12" strokeLinecap="round" />
                    <path d="M125 60 L130 80" stroke="white" strokeWidth="12" strokeLinecap="round" />
                </g>
            </svg>
            
            {/* Shadow Effect */}
            <div className="w-1/2 h-3 bg-black/20 rounded-[100%] blur-sm -mt-2 animate-pixa-shadow"></div>
            
            <style>{`
                @keyframes pixa-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes pixa-shadow {
                    0%, 100% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(0.8); opacity: 0.15; }
                }
                @keyframes pixa-thinking {
                    0% { transform: rotate(0deg) scale(1); }
                    25% { transform: rotate(-5deg) scale(1.05); }
                    50% { transform: rotate(0deg) scale(1); }
                    75% { transform: rotate(5deg) scale(1.05); }
                    100% { transform: rotate(0deg) scale(1); }
                }
                @keyframes pixa-bounce {
                    0%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-20px); }
                    60% { transform: translateY(-10px); }
                }
                @keyframes pixa-shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-5px); }
                    40% { transform: translateX(5px); }
                    60% { transform: translateX(-5px); }
                    80% { transform: translateX(5px); }
                }
                @keyframes antenna-wiggle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-10deg); }
                    75% { transform: rotate(10deg); }
                }
                @keyframes pixa-blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                
                .animate-pixa-float { animation: pixa-float 3s ease-in-out infinite; }
                .animate-pixa-shadow { animation: pixa-shadow 3s ease-in-out infinite; }
                .animate-pixa-thinking { animation: pixa-thinking 2s ease-in-out infinite; }
                .animate-pixa-bounce { animation: pixa-bounce 1s ease-in-out infinite; }
                .animate-pixa-shake { animation: pixa-shake 0.5s ease-in-out; }
                .animate-antenna-wiggle { animation: antenna-wiggle 4s ease-in-out infinite; transform-origin: 100px 40px; }
                .animate-pixa-blink { animation: pixa-blink 4s infinite; transform-origin: center; }
            `}</style>
        </div>
    );
};