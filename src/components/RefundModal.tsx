
import React, { useState } from 'react';
import { XIcon, FlagIcon } from './icons';

interface RefundModalProps {
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isProcessing: boolean;
    featureName?: string;
}

export const RefundModal: React.FC<RefundModalProps> = ({ onClose, onConfirm, isProcessing, featureName = "generation" }) => {
    const [reason, setReason] = useState('');
    const reasons = [
        "Faces are distorted / blurry",
        "Didn't follow my instructions",
        "Glitch or Artifacts in image",
        "Unrealistic lighting/blending",
        "Other"
    ];

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative m-4" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <XIcon className="w-5 h-5"/>
                </button>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FlagIcon className="w-5 h-5 text-red-500"/> Report Issue
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    We're sorry the {featureName} didn't work perfectly. Select a reason to request a refund.
                </p>

                <div className="space-y-2 mb-6">
                    {reasons.map(r => (
                        <button 
                            key={r}
                            onClick={() => setReason(r)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
                                reason === r 
                                ? 'bg-red-50 border-red-500 text-red-700' 
                                : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold text-xs hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                    <button 
                        onClick={() => onConfirm(reason)}
                        disabled={!reason || isProcessing}
                        className="flex-1 py-3 bg-[#1A1A1E] text-white rounded-xl font-bold text-xs hover:bg-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Submit & Refund"}
                    </button>
                </div>
            </div>
        </div>
    );
};
