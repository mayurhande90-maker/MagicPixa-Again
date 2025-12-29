import React from 'react';
import { PlusIcon, RegenerateIcon, FlagIcon, MagicWandIcon } from './icons';

interface ResultToolbarProps {
    onNew?: () => void;
    onRegen?: () => void;
    onEdit?: () => void;
    onReport?: () => void;
}

export const ResultToolbar: React.FC<ResultToolbarProps> = ({ onNew, onRegen, onEdit, onReport }) => {
    const buttons = [
        onNew && { label: 'New Project', icon: PlusIcon, onClick: onNew, color: 'text-gray-700', bg: 'hover:bg-gray-100' },
        onRegen && { label: 'Regenerate', icon: RegenerateIcon, onClick: onRegen, color: 'text-blue-600', bg: 'hover:bg-blue-50' },
        onEdit && { label: 'Magic Editor', icon: MagicWandIcon, onClick: onEdit, color: 'text-indigo-600', bg: 'hover:bg-indigo-50' },
        onReport && { label: 'Report Issue', icon: FlagIcon, onClick: onReport, color: 'text-red-500', bg: 'hover:bg-red-50' },
    ].filter(Boolean) as any[];

    if (buttons.length === 0) return null;

    return (
        <div className="flex flex-col gap-1.5 items-end pointer-events-auto">
            {buttons.map((btn, idx) => (
                <button
                    key={btn.label}
                    onClick={(e) => { e.stopPropagation(); btn.onClick(); }}
                    className={`flex items-center justify-start gap-0 group-hover:gap-2 px-2 py-2 bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-gray-100 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-105 hover:shadow-md w-8 group-hover:w-36 overflow-hidden ${btn.bg} animate-[fadeInRight_0.4s_ease-out]`}
                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' }}
                    title={btn.label}
                >
                    <btn.icon className={`w-4 h-4 ${btn.color} shrink-0`} />
                    <span className={`text-[10px] font-bold ${btn.color} whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75`}>
                        {btn.label}
                    </span>
                </button>
            ))}
            <style>{`
                @keyframes fadeInRight {
                    from { opacity: 0; transform: translateX(10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};