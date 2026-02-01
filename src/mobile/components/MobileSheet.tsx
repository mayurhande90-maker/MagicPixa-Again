import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '../../components/icons';

interface MobileSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
}

export const MobileSheet: React.FC<MobileSheetProps> = ({ isOpen, onClose, title, children }) => {
    // Prevent body scroll when open to maintain "App" feel
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    return createPortal(
        <div className={`fixed inset-0 z-[100] flex items-end justify-center transition-all duration-300 ${isOpen ? 'visible' : 'invisible delay-300'}`}>
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />
            
            {/* Sheet Surface */}
            <div 
                className={`relative w-full max-w-lg bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] px-6 pt-2 pb-12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
            >
                {/* Drag Handle Indicator */}
                <div className="flex justify-center mb-4">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="min-w-0 flex-1 pr-4">
                        <div className="text-xl font-black text-gray-900 tracking-tight leading-none">
                            {title}
                        </div>
                        <div className="h-1 w-8 bg-indigo-500 rounded-full mt-2"></div>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-gray-50 rounded-full text-gray-400 active:scale-90 transition-transform flex-shrink-0">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="animate-fadeInUp overflow-y-auto max-h-[60vh] no-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};
