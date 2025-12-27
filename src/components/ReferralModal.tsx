
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, CopyIcon, GiftIcon, CheckIcon, ArrowRightIcon, InformationCircleIcon } from './icons';
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4" onClick={onClose}>
             <div className="relative bg-white w-full max-w-md p-[min(6vh,48px)] rounded-[2.5rem] shadow-2xl transform animate-bounce-slight" onClick={e => e.stopPropagation()}>
                 <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><XIcon className="w-6 h-6" /></button>
                 
                 <div className="text-center mb-[min(5vh,40px)]">
                     <div className="w-[clamp(60px,10vh,80px)] h-[clamp(60px,10vh,80px)] bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-purple-100">
                         <GiftIcon className="w-1/2 h-1/2 text-purple-600" />
                     </div>
                     <h2 className="text-[clamp(20px,3.5vh,28px)] font-black text-[#1A1A1E] tracking-tight">Refer & Earn</h2>
                     <p className="text-[clamp(11px,1.5vh,14px)] text-gray-500 mt-2 px-4 font-medium">
                         Share your code. You both get <span className="font-bold text-purple-600">+10 credits</span> when a friend joins!
                     </p>
                 </div>

                 {/* Section 1: Your Code */}
                 <div className="bg-gray-50 p-[min(3vh,24px)] rounded-3xl border border-gray-200 mb-[min(4vh,32px)]">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block text-center">Your Unique Code</label>
                     <div className="flex items-center gap-3 bg-white p-[min(2vh,16px)] rounded-2xl border border-gray-200 shadow-sm">
                         <div className="flex-1 text-center font-mono text-[clamp(18px,3vh,24px)] font-black text-gray-800 tracking-widest select-all">
                             {user.referralCode || '...'}
                         </div>
                         <button 
                            onClick={handleCopy}
                            className={`p-3 rounded-xl transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            title="Copy Code"
                         >
                             {copied ? <CheckIcon className="w-6 h-6" /> : <CopyIcon className="w-6 h-6" />}
                         </button>
                     </div>
                 </div>

                 {/* Section 2: Claim Code (Only if not referred) */}
                 {!user.referredBy ? (
                     <div className="border-t border-gray-100 pt-[min(4vh,32px)]">
                         <p className="text-xs font-black text-gray-700 mb-4 text-center uppercase tracking-wider">Have a referral code?</p>
                         <form onSubmit={handleClaim} className="relative">
                             <div className="flex items-center gap-3 mb-4">
                                 <input 
                                    type="text" 
                                    placeholder="ENTER CODE"
                                    className={`flex-1 bg-gray-50 border-2 focus:border-purple-500 rounded-2xl px-5 py-[min(2vh,16px)] outline-none font-black text-gray-700 placeholder-gray-400 text-center uppercase tracking-widest transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                    value={inputCode}
                                    onChange={(e) => {
                                        setInputCode(e.target.value.toUpperCase());
                                        setError(null); 
                                    }}
                                    maxLength={10}
                                 />
                                 <button 
                                    type="submit"
                                    disabled={claiming || !inputCode}
                                    className={`px-6 py-[min(2vh,16px)] rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all flex items-center gap-2 ${
                                        claiming || !inputCode 
                                        ? 'bg-gray-300 cursor-not-allowed grayscale' 
                                        : 'bg-purple-600 hover:bg-purple-700 hover:scale-105'
                                    }`}
                                 >
                                     {claiming ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Claim"}
                                 </button>
                             </div>
                             
                             {error && (
                                 <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3 animate-fadeIn text-left">
                                     <InformationCircleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                     <p className="text-[10px] font-bold text-red-600 leading-relaxed uppercase">{error}</p>
                                 </div>
                             )}
                             
                             {successMessage && (
                                 <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center justify-center gap-2 animate-fadeIn">
                                     <CheckIcon className="w-5 h-5 text-green-600" />
                                     <p className="text-xs font-bold text-green-700">{successMessage}</p>
                                 </div>
                             )}
                         </form>
                     </div>
                 ) : (
                     <div className="text-center bg-green-50 text-green-700 px-5 py-4 rounded-2xl border border-green-100 text-xs font-black uppercase tracking-wide">
                         <CheckIcon className="w-4 h-4 inline-block mr-2 -mt-0.5"/> Referral Reward Claimed!
                     </div>
                 )}

                 {/* Stats */}
                 <div className="grid grid-cols-2 gap-4 mt-8 text-center border-t border-gray-100 pt-6">
                     <div>
                         <p className="text-2xl font-black text-indigo-600">{user.referralCount || 0}</p>
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Friends Joined</p>
                     </div>
                     <div>
                         <p className="text-2xl font-black text-green-600">{(user.referralCount || 0) * 10}</p>
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Credits Earned</p>
                     </div>
                 </div>
             </div>
        </div>,
        document.body
    );
};
