import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, CopyIcon, GiftIcon, CheckIcon, InformationCircleIcon } from '../../components/icons';
import { User } from '../../types';
import { claimReferralCode } from '../../firebase';

interface MobileReferralModalProps {
    user: User;
    onClose: () => void;
    onClaimSuccess?: (updatedUser: User) => void;
}

export const MobileReferralModal: React.FC<MobileReferralModalProps> = ({ user, onClose, onClaimSuccess }) => {
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
             <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl transform animate-bounce-slight flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                 
                 {/* Close Button */}
                 <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-full transition-colors z-10">
                    <XIcon className="w-5 h-5" />
                 </button>
                 
                 {/* Scrollable Content Container */}
                 <div className="overflow-y-auto px-6 pt-10 pb-8 no-scrollbar">
                    
                    {/* Header */}
                    <div className="text-center flex flex-col items-center mb-6">
                        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4 shadow-inner border border-purple-100">
                            <GiftIcon className="w-8 h-8 text-purple-600" />
                        </div>
                        <h2 className="text-xl font-black text-[#1A1A1E] tracking-tight">Refer & Earn</h2>
                        <p className="text-xs text-gray-500 mt-2 px-2 font-medium leading-relaxed">
                            Share your code. You both get <span className="font-bold text-purple-600">+10 credits</span> when a friend joins!
                        </p>
                    </div>

                    {/* Section 1: Your Code */}
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block text-center">Your Unique Code</label>
                        <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex-1 text-center font-mono text-lg font-black text-gray-800 tracking-widest select-all">
                                {user.referralCode || '...'}
                            </div>
                            <button 
                                onClick={handleCopy}
                                className={`p-2.5 rounded-lg transition-all active:scale-90 ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
                            >
                                {copied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Section 2: Claim Code */}
                    {!user.referredBy ? (
                        <div className="border-t border-gray-100 pt-6">
                            <p className="text-[10px] font-black text-gray-700 mb-3 text-center uppercase tracking-wider">Have a referral code?</p>
                            <form onSubmit={handleClaim} className="space-y-3">
                                <div className="flex flex-col gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="ENTER CODE"
                                        className={`w-full bg-gray-50 border-2 focus:border-purple-500 rounded-xl px-4 py-3.5 outline-none font-black text-gray-700 placeholder-gray-300 text-center uppercase tracking-widest transition-colors text-sm ${error ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
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
                                        className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                            claiming || !inputCode 
                                            ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                                            : 'bg-purple-600 shadow-purple-500/20'
                                        }`}
                                    >
                                        {claiming ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Claim Credit"}
                                    </button>
                                </div>
                                
                                {error && (
                                    <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 flex items-start gap-2 animate-fadeIn">
                                        <InformationCircleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-red-600 leading-tight uppercase">{error}</p>
                                    </div>
                                )}
                                
                                {successMessage && (
                                    <div className="bg-green-50 border border-green-100 rounded-lg p-2.5 flex items-center justify-center gap-2 animate-fadeIn">
                                        <CheckIcon className="w-4 h-4 text-green-600" />
                                        <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">{successMessage}</p>
                                    </div>
                                )}
                            </form>
                        </div>
                    ) : (
                        <div className="text-center bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-100 text-[10px] font-black uppercase tracking-wide">
                            <CheckIcon className="w-4 h-4 inline-block mr-1.5 -mt-0.5"/> Referral Reward Claimed!
                        </div>
                    )}

                    {/* Stats Footer */}
                    <div className="grid grid-cols-2 gap-4 mt-8 text-center border-t border-gray-100 pt-6">
                        <div>
                            <p className="text-xl font-black text-indigo-600">{user.referralCount || 0}</p>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Friends Joined</p>
                        </div>
                        <div>
                            <p className="text-xl font-black text-green-600">{(user.referralCount || 0) * 10}</p>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Credits Earned</p>
                        </div>
                    </div>
                 </div>
             </div>
        </div>,
        document.body
    );
};
