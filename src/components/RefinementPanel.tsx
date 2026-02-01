
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, SparklesIcon, CreditCoinIcon, ArrowRightIcon } from './icons';

interface RefinementPanelProps {
    isActive: boolean;
    isRefining: boolean;
    onClose: () => void;
    onRefine: (text: string) => void;
    refineCost: number;
    placeholder?: string;
}

export const RefinementPanel: React.FC<RefinementPanelProps> = ({ 
    isActive, 
    isRefining, 
    onClose, 
    onRefine, 
    refineCost,
    placeholder = "Describe your changes... (e.g. Add water droplets, make lighting warmer)"
}) => {
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Fluid height effect
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [text, isActive]);

    if (!isActive || isRefining) return null;

    const handleSubmit = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (text.trim()) {
            onRefine(text);
            setText('');
        }
    };

    return (
        <div 
            className="bg-gray-900/95 backdrop-blur-2xl border border-white/20 p-3 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col gap-4 animate-[fadeInUp_0.4s_cubic-bezier(0.16,1,0.3,1)] pointer-events-auto w-full max-w-lg mx-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between px-3 pt-2">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">Pixa Retoucher Active</span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }} 
                    className="text-white/40 hover:text-white transition-colors"
                >
                    <XIcon className="w-4 h-4"/>
                </button>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-1.5 flex gap-3 items-start border border-white/5">
                <textarea 
                    ref={textareaRef}
                    rows={1}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent border-none px-4 py-3 text-[clamp(13px,1.8vh,15px)] font-medium text-white placeholder-gray-500 outline-none focus:ring-0 resize-none max-h-40 custom-scrollbar overflow-y-auto"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
                <button 
                    onClick={handleSubmit}
                    disabled={!text.trim()}
                    className="bg-[#F9D230] hover:bg-[#dfbc2b] text-black px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center shadow-lg active:scale-95 mt-1"
                >
                    Apply <ArrowRightIcon className="w-4 h-4 ml-2" />
                </button>
            </div>

            <div className="flex justify-center pb-2">
                <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 shadow-xl">
                    <CreditCoinIcon className="w-3 h-3 text-yellow-400"/>
                    <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">
                        {refineCost} Credits Per Iteration
                    </span>
                </div>
            </div>
        </div>
    );
};
