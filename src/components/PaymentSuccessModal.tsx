import React from 'react';
import { createPortal } from 'react-dom';

interface PaymentSuccessModalProps {
    creditsAdded: number;
    packName: string;
    onClose: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({ creditsAdded, packName, onClose }) => {
    return createPortal(
        <div 
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
            aria-labelledby="payment-success-title"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white w-full max-w-sm m-4 p-8 rounded-[2.5rem] shadow-2xl text-center relative overflow-hidden animate-bounce-slight">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>
                <div className="checkmark my-6">
                    <svg className="w-full h-full" viewBox="0 0 52 52">
                        <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                        <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                </div>
                <h2 id="payment-success-title" className="text-2xl font-black text-[#1A1A1E] mb-2 tracking-tight">Payment Successful!</h2>
                <div className="mb-8">
                    <p className="text-[#5F6368] font-medium leading-relaxed">
                        {packName === 'Credit Refill' ? (
                            <>Your <span className="font-bold text-[#1A1A1E]">{packName}</span> was processed.</>
                        ) : (
                            <>Your <span className="font-bold text-[#1A1A1E]">{packName}</span> is now active.</>
                        )}
                        <br />
                        We've added <span className="font-bold text-[#1A1A1E]">{creditsAdded} credits</span> to your account.
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="w-full bg-[#F9D230] text-[#1A1A1E] font-bold py-4 rounded-2xl hover:bg-[#dfbc2b] transition-all shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-95"
                >
                    Start Creating
                </button>
            </div>
        </div>,
        document.body
    );
};