import React from 'react';
import { createPortal } from 'react-dom';

interface PaymentSuccessModalProps {
    creditsAdded: number;
    onClose: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({ creditsAdded, onClose }) => {
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
                <p className="text-[#5F6368] mb-8 font-medium">
                    Excellent! We've added <span className="font-bold text-[#1A1A1E]">{creditsAdded} credits</span> to your account. You're ready to create magic.
                </p>
                <button
                    onClick={onClose}
                    className="w-full bg-[#1A1A1E] text-white font-bold py-4 rounded-2xl hover:bg-black transition-all shadow-lg hover:scale-[1.02] active:scale-95"
                >
                    Start Creating
                </button>
            </div>
        </div>,
        document.body
    );
};