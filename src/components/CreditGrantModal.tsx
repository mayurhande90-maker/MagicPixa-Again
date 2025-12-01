
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, SparklesIcon, GiftIcon } from './icons';
import { clearCreditGrantNotification } from '../firebase';

interface CreditGrantModalProps {
    userId: string;
    amount: number;
    message: string;
    type?: 'credit' | 'package';
    packageName?: string;
}

export const CreditGrantModal: React.FC<CreditGrantModalProps> = ({ userId, amount, message, type = 'credit', packageName }) => {
    const [isClaimed, setIsClaimed] = useState(false);

    const handleClaim = async () => {
        setIsClaimed(true);
        setTimeout(async () => {
            await clearCreditGrantNotification(userId);
        }, 1500);
    };

    const title = type === 'package' ? 'Package Unlocked!' : 'Credits Granted!';
    const subTitle = type === 'package' ? (packageName || 'New Plan') : 'Bonus Received';

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
             <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center transform animate-bounce-slight text-white border border-white/10" onClick={e => e.stopPropagation()}>
                 {!isClaimed ? (
                     <div className="animate-fadeIn">
                         <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                             {type === 'package' ? <GiftIcon className="w-10 h-10 text-yellow-300 animate-pulse" /> : <SparklesIcon className="w-10 h-10 text-yellow-300 animate-spin-slow" />}
                         </div>
                         
                         <h2 className="text-2xl font-bold mt-4 mb-1">{title}</h2>
                         {type === 'package' && <p className="text-lg font-semibold text-white/90 mb-2">{subTitle}</p>}
                         
                         <p className="text-indigo-100 mb-6 text-sm leading-relaxed px-2 bg-black/10 py-2 rounded-lg border border-white/5">
                             "{message || "You've received a special grant."}"
                         </p>
                         
                         <div className="bg-white/20 backdrop-blur-md text-white font-black text-4xl py-6 rounded-2xl mb-6 border border-white/30 shadow-inner">
                             +{amount} <span className="text-lg font-bold opacity-80">Credits</span>
                         </div>
                         
                         <button 
                            onClick={handleClaim} 
                            className="w-full bg-white text-indigo-600 font-bold py-3.5 rounded-xl hover:bg-indigo-50 transition-all shadow-lg hover:scale-[1.02] active:scale-95"
                         >
                             {type === 'package' ? 'Awesome!' : 'Claim Credits'}
                         </button>
                     </div>
                 ) : (
                     <div className="animate-[fadeInUp_0.5s_ease-out] py-4">
                         <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_#22c55e] animate-[bounce_1s_infinite]">
                             <CheckIcon className="w-12 h-12 text-white" />
                         </div>
                         
                         <h2 className="text-3xl font-bold mb-2 text-white">Updated!</h2>
                         <p className="text-indigo-200 text-sm mb-6">Your account has been upgraded.</p>
                     </div>
                 )}
             </div>
        </div>,
        document.body
    );
};
