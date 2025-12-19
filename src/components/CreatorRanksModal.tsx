import React from 'react';
import { createPortal } from 'react-dom';
import { XIcon, CheckIcon, BadgeNoviceIcon, BadgeCopperIcon, BadgeSilverIcon, BadgeGoldIcon } from './icons';

interface CreatorRanksModalProps {
    onClose: () => void;
    currentGens: number;
}

export const CreatorRanksModal: React.FC<CreatorRanksModalProps> = ({ onClose, currentGens }) => {
    const ranks = [
        { name: 'Rising Creator', min: 0, icon: BadgeNoviceIcon, color: 'text-gray-500', bg: 'bg-gray-100' },
        { name: 'Professional Creator', min: 10, icon: BadgeCopperIcon, color: 'text-orange-600', bg: 'bg-orange-100' },
        { name: 'Silver Creator', min: 30, icon: BadgeSilverIcon, color: 'text-slate-600', bg: 'bg-slate-100' },
        { name: 'Gold Creator', min: 100, icon: BadgeGoldIcon, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
             <div className="relative bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl transform animate-bounce-slight" onClick={e => e.stopPropagation()}>
                 <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon className="w-6 h-6" /></button>
                 
                 <div className="text-center mb-6">
                     <h2 className="text-2xl font-bold text-[#1A1A1E]">Creator Ranks</h2>
                     <p className="text-sm text-gray-500 mt-1">Level up by creating more magic.</p>
                 </div>

                 <div className="space-y-3 relative">
                     {/* Connecting Line */}
                     <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-100 -z-10"></div>

                     {ranks.map((rank, idx) => {
                         const isUnlocked = currentGens >= rank.min;
                         
                         return (
                             <div key={rank.name} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isUnlocked ? 'bg-white border-gray-200 shadow-sm scale-100' : 'bg-gray-50 border-transparent opacity-60 grayscale scale-95'}`}>
                                 <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${rank.bg}`}>
                                     <rank.icon className={`w-6 h-6 ${rank.color}`} />
                                 </div>
                                 <div className="flex-1 text-left">
                                     <h3 className={`font-bold ${isUnlocked ? 'text-[#1A1A1E]' : 'text-gray-500'}`}>{rank.name}</h3>
                                     <p className="text-xs text-gray-400 font-medium">{rank.min}+ Generations</p>
                                 </div>
                                 {isUnlocked && (
                                     <div className="bg-green-100 text-green-600 p-1 rounded-full">
                                         <CheckIcon className="w-4 h-4" />
                                     </div>
                                 )}
                             </div>
                         );
                     })}
                 </div>
             </div>
        </div>,
        document.body
    );
};