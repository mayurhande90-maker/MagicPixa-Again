
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, CopyIcon, GiftIcon, CheckIcon, ArrowRightIcon } from './icons';
import { User } from '../types';
import { claimReferralCode } from '../firebase';

interface ReferralModalProps {
    user: User;
    onClose: () => void;
    onClaimSuccess?: (updatedUser: User) => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ user, onClose, onClaimSuccess }) => {
    const [copied, setCopied] = useState(false);
    const [inputCode, setInputCode] = useState('');
    const [claiming, setClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleCopy = () => {
        if (user.referralCode) {
            navigator.clipboard.writeText(user.referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputCode.trim()) return;
        
        setClaiming(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const updatedData = await claimReferralCode(user.uid, inputCode);
            // Merge updated data into a User object to update local state
            const updatedUser = { ...user, ...updatedData } as User;
            
            setSuccessMessage("Success! 10 Credits added.");
            if (onClaimSuccess) {
                onClaimSuccess(updatedUser);
            }
            setInputCode('');
        } catch (err: any) {
            setError(err.message || "Failed to claim code.");
        } finally {
            setClaiming(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
             <div className="relative bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl transform animate-bounce-slight" onClick={e => e.stopPropagation()}>
                 <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon className="w-6 h-6" /></button>
                 
                 <div className="text-center mb-8">
                     <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                         <GiftIcon className="w-10 h-10 text-purple-600" />
                     </div>
                     <h2 className="text-2xl font-bold text-[#1A1A1E]">Refer & Earn</h2>
                     <p className="text-sm text-gray-500 mt-2 px-4">
                         Share your code. You both get <span className="font-bold text-purple-600">+10 credits</span> when a friend uses it!
                     </p>
                 </div>

                 {/* Section 1: Your Code */}
                 <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mb-6">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 block text-center">Your Unique Code</label>
                     <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                         <div className="flex-1 text-center font-mono text-2xl font-bold text-gray-800 tracking-widest select-all">
                             {user.referralCode || '...'}
                         </div>
                         <button 
                            onClick={handleCopy}
                            className={`p-2.5 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            title="Copy Code"
                         >
                             {copied ? <CheckIcon className="w-6 h-6" /> : <CopyIcon className="w-6 h-6" />}
                         </button>
                     </div>
                 </div>

                 {/* Section 2: Claim Code (Only if not referred) */}
                 {!user.referredBy ? (
                     <div className="border-t border-gray-100 pt-6">
                         <p className="text-sm font-bold text-gray-700 mb-3 text-center">Have a referral code?</p>
                         <form onSubmit={handleClaim} className="relative">
                             <div className="flex items-center gap-2">
                                 <input 
                                    type="text" 
                                    placeholder="ENTER CODE"
                                    className="flex-1 bg-gray-50 border-2 border-gray-200 focus:border-purple-500 rounded-xl px-4 py-3 outline-none font-bold text-gray-700 placeholder-gray-400 text-center uppercase tracking-widest transition-colors"
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                    maxLength={10}
                                 />
                                 <button 
                                    type="submit"
                                    disabled={claiming || !inputCode}
                                    className={`px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                                        claiming || !inputCode 
                                        ? 'bg-gray-300 cursor-not-allowed' 
                                        : 'bg-purple-600 hover:bg-purple-700 hover:scale-105'
                                    }`}
                                 >
                                     {claiming ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Claim"}
                                 </button>
                             </div>
                             {error && <p className="text-red-500 text-xs font-bold mt-2 text-center bg-red-50 py-1 rounded-lg">{error}</p>}
                             {successMessage && <p className="text-green-600 text-xs font-bold mt-2 text-center bg-green-50 py-1 rounded-lg">{successMessage}</p>}
                         </form>
                     </div>
                 ) : (
                     <div className="text-center bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-100 text-sm font-bold">
                         <CheckIcon className="w-4 h-4 inline-block mr-1 -mt-0.5"/> You have claimed your signup bonus!
                     </div>
                 )}

                 {/* Stats */}
                 <div className="grid grid-cols-2 gap-4 mt-6 text-center border-t border-gray-100 pt-6">
                     <div>
                         <p className="text-2xl font-bold text-blue-600">{user.referralCount || 0}</p>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Friends Invited</p>
                     </div>
                     <div>
                         <p className="text-2xl font-bold text-green-600">{(user.referralCount || 0) * 10}</p>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Credits Earned</p>
                     </div>
                 </div>
             </div>
        </div>,
        document.body
    );
};
