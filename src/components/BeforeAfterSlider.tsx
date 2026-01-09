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
            className={`relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group select-none cursor-ew-resize bg-gray-50 ${className}`}
            onMouseMove={onMouseMove}
            onTouchMove={onTouchMove}
        >
            {/* After Image (The Primary Frame) */}
            {/* We use relative positioning and h-auto here to define the height of the container */}
            <img 
                key={afterImage}
                src={afterImage} 
                alt="After AI" 
                className="w-full h-auto block animate-fadeIn pointer-events-none"
            />

            {/* Before Image (The Overlay with Clip) */}
            <div 
                className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
                <img 
                    key={beforeImage}
                    src={beforeImage} 
                    alt="Before AI" 
                    className="w-full h-full object-cover grayscale-[0.1] brightness-95 animate-fadeIn"
                />
            </div>

            {/* Labels */}
            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-30 pointer-events-none">
                <div className={`px-3 sm:px-4 py-1.5 sm:py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/70 transition-all duration-500 ${position < 15 ? 'opacity-0 -translate-x-4' : 'opacity-100 translate-x-0'}`}>
                    <div className="flex items-center gap-2">
                        <CameraIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                        {beforeLabel}
                    </div>
                </div>
            </div>

            <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-30 pointer-events-none">
                <div className={`px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600/60 backdrop-blur-md border border-indigo-400/30 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all duration-500 ${position > 85 ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-yellow-300" />
                        {afterLabel}
                    </div>
                </div>
            </div>

            {/* Slider Line & Handle */}
            <div 
                className="absolute top-0 bottom-0 z-40 w-1 bg-white/40 backdrop-blur-sm pointer-events-none"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-indigo-500 transition-transform group-hover:scale-110">
                    <div className="flex gap-1">
                        <div className="w-0.5 h-3 sm:h-4 bg-indigo-200 rounded-full"></div>
                        <div className="w-0.5 h-3 sm:h-4 bg-indigo-500 rounded-full"></div>
                        <div className="w-0.5 h-3 sm:h-4 bg-indigo-200 rounded-full"></div>
                    </div>
                    {/* Handle Glow */}
                    <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-20"></div>
                </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-opacity duration-700 group-hover:opacity-0">
                <div className="bg-black/60 backdrop-blur-xl px-5 sm:px-6 py-1.5 sm:py-2 rounded-full border border-white/10 shadow-2xl">
                    <p className="text-white font-bold text-[8px] sm:text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                        <span className="animate-bounce">←</span>
                        Reveal Result
                        <span className="animate-bounce">→</span>
                    </p>
                </div>
            </div>
        </div>
    );
};