import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '../../components/icons';

interface MobileSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
}

export const MobileSheet: React.FC<MobileSheetProps> = ({ isOpen, onClose, title, children }) => {
    const [translateY, setTranslateY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const touchStartY = useRef(0);
    const sheetRef = useRef<HTMLDivElement>(null);

    // Prevent body scroll when open to maintain "App" feel
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setTranslateY(0);
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleTouchStart = (e: React.TouchEvent) => {
        // Only allow dragging from the header or the handle
        touchStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;
        
        // Only allow dragging downwards
        if (diff > 0) {
            setTranslateY(diff);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        // Threshold for closing: 100px
        if (translateY > 100) {
            onClose();
        } else {
            // Spring back if not dragged far enough
            setTranslateY(0);
        }
    };

    return createPortal(
        <div className={`fixed inset-0 z-[100] flex items-end justify-center transition-all duration-300 ${isOpen ? 'visible' : 'invisible delay-300'}`}>
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />
            
            {/* Sheet Surface */}
            <div 
                ref={sheetRef}
                style={{ 
                    transform: `translateY(${isOpen ? translateY : '100'}%)`,
                    transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)'
                }}
                className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] px-6 pt-2 pb-12 overflow-hidden"
            >
                {/* Drag Handle Indicator & Header Interaction Area */}
                <div 
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="w-full pt-2 pb-4 cursor-grab active:cursor-grabbing"
                >
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1 pr-4">
                            <div className="text-xl font-black text-gray-900 tracking-tight leading-none">
                                {title}
                            </div>
                            <div className="h-1 w-8 bg-indigo-500 rounded-full mt-2"></div>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onClose(); }} 
                            className="p-2.5 bg-gray-50 rounded-full text-gray-400 active:scale-90 transition-transform flex-shrink-0"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className={`overflow-y-auto max-h-[60vh] no-scrollbar ${isDragging ? 'pointer-events-none' : ''}`}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};