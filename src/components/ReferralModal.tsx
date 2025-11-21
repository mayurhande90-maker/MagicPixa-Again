
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, CopyIcon, GiftIcon, CheckIcon } from './icons';
import { User } from '../types';

interface ReferralModalProps {
    user: User;
    onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ user, onClose }) => {
    const [copied, setCopied] = useState(false);
    
    const referralLink = `${window.location.origin}/?ref=${user.referralCode || ''}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
             <div className="relative bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl transform animate-bounce-slight" onClick={e => e.stopPropagation()}>
                 <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon className="w-6 h-6" /></button>
                 
                 <div className="text-center mb-8">
                     <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                         <GiftIcon className="w-10 h-10 text-purple-600" />
                     </div>
                     <h2 className="text-2xl font-bold text-[#1A1A1E]">Refer & Earn</h2>
                     <p className="text-sm text-gray-500 mt-2 px-4">
                         Invite your friends to MagicPixa. They get <span className="font-bold text-purple-600">+10 credits</span>, and you get <span className="font-bold text-purple-600">+10 credits</span> when they join!
                     </p>
                 </div>

                 <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-6">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Your Referral Link</label>
                     <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200">
                         <input 
                            readOnly 
                            value={referralLink} 
                            className="flex-1 text-sm font-medium text-gray-600 outline-none bg-transparent truncate px-2"
                         />
                         <button 
                            onClick={handleCopy}
                            className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                         >
                             {copied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                         </button>
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                     <div className="p-4 bg-blue-50 rounded-2xl">
                         <p className="text-2xl font-bold text-blue-600">{user.referralCount || 0}</p>
                         <p className="text-xs font-bold text-blue-400 uppercase">Friends Invited</p>
                     </div>
                     <div className="p-4 bg-green-50 rounded-2xl">
                         <p className="text-2xl font-bold text-green-600">{(user.referralCount || 0) * 10}</p>
                         <p className="text-xs font-bold text-green-400 uppercase">Credits Earned</p>
                     </div>
                 </div>
                 
                 <div className="text-center text-xs text-gray-400">
                     Limits apply. Self-referrals are not allowed.
                 </div>
             </div>
        </div>,
        document.body
    );
};
