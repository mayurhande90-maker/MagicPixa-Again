import React, { useState, useRef, useCallback } from 'react';
import { SparklesIcon, CameraIcon } from './icons';

interface BeforeAfterSliderProps {
    beforeImage: string;
    afterImage: string;
    beforeLabel?: string;
    afterLabel?: string;
    className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
    beforeImage,
    afterImage,
    beforeLabel = "Before",
    afterLabel = "After",
    className = ""
}) => {
    const [position, setPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = useCallback((clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percent = (x / rect.width) * 100;
        setPosition(percent);
    }, []);

    const onMouseMove = (e: React.MouseEvent) => {
        if (e.buttons === 1 || e.type === 'mousemove') {
            handleMove(e.clientX);
        }
    };

    const onTouchMove = (e: React.TouchEvent) => {
        handleMove(e.touches[0].clientX);
    };

    return (
        <div 
            ref={containerRef}
            className={`relative aspect-[4/5] md:aspect-[16/9] w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group select-none cursor-ew-resize bg-[#0F1115] ${className}`}
            onMouseMove={onMouseMove}
            onTouchMove={onTouchMove}
        >
            {/* Studio Stage Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
                 style={{ 
                     backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
                     backgroundSize: '24px 24px' 
                 }}>
            </div>
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none"></div>

            {/* After Image (Base) */}
            <div className="absolute inset-0 flex items-center justify-center">
                <img 
                    key={afterImage}
                    src={afterImage} 
                    alt="After AI" 
                    className="max-w-full max-h-full object-contain animate-fadeIn z-10"
                />
            </div>

            {/* Before Image (Overlay with Clip) */}
            <div 
                className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
                <img 
                    key={beforeImage}
                    src={beforeImage} 
                    alt="Before AI" 
                    className="max-w-full max-h-full object-contain grayscale-[0.2] brightness-75 animate-fadeIn"
                />
            </div>

            {/* Labels */}
            <div className="absolute top-6 left-6 z-40 pointer-events-none">
                <div className={`px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white/70 transition-opacity duration-500 ${position < 15 ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="flex items-center gap-2">
                        <CameraIcon className="w-3 h-3" />
                        {beforeLabel}
                    </div>
                </div>
            </div>

            <div className="absolute top-6 right-6 z-40 pointer-events-none">
                <div className={`px-4 py-2 bg-indigo-600/60 backdrop-blur-md border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white transition-opacity duration-500 ${position > 85 ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-3 h-3 text-yellow-300" />
                        {afterLabel}
                    </div>
                </div>
            </div>

            {/* Slider Line & Handle */}
            <div 
                className="absolute top-0 bottom-0 z-50 w-1 bg-white/40 backdrop-blur-sm pointer-events-none"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-indigo-500 transition-transform group-hover:scale-110">
                    <div className="flex gap-1">
                        <div className="w-0.5 h-4 bg-indigo-200 rounded-full"></div>
                        <div className="w-0.5 h-4 bg-indigo-500 rounded-full"></div>
                        <div className="w-0.5 h-4 bg-indigo-200 rounded-full"></div>
                    </div>
                    {/* Handle Glow */}
                    <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-20"></div>
                </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-opacity duration-700 group-hover:opacity-0">
                <div className="bg-black/60 backdrop-blur-xl px-6 py-2 rounded-full border border-white/10 shadow-2xl">
                    <p className="text-white font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                        <span className="animate-bounce">←</span>
                        Slide to Reveal
                        <span className="animate-bounce">→</span>
                    </p>
                </div>
            </div>
        </div>
    );
};