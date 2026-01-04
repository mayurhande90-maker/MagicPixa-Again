import { User } from '../types';
import { purchaseTopUp, purchaseCreditRefill, getCreditHistory } from '../firebase';

export interface CheckoutOptions {
    user: User;
    pkg: any;
    type: 'plan' | 'refill';
    onSuccess: (updatedUser: User, totalCredits: number) => void;
    onCancel: () => void;
    onError: (error: string) => void;
}

/**
 * Triggers the Razorpay checkout modal.
 */
export const triggerCheckout = async (options: CheckoutOptions) => {
    const { user, pkg, type, onSuccess, onCancel, onError } = options;

    if (!window.Razorpay) {
        onError("Payment gateway is not available. Please check your internet connection.");
        return;
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey || razorpayKey === 'undefined') {
        onError("Payment gateway configuration error.");
        return;
    }

    const checkoutConfig = {
        key: razorpayKey,
        amount: pkg.price * 100, // Amount in paise
        currency: "INR",
        name: `MagicPixa: ${type === 'plan' ? pkg.name : 'Credit Refill'}`,
        description: `Purchase of ${pkg.totalCredits} credits.`,
        image: "https://aistudio.google.com/static/img/workspace/gemini-pro-icon.svg",
        handler: async (response: any) => {
            try {
                let updatedProfile;
                if (type === 'plan') {
                    updatedProfile = await purchaseTopUp(user.uid, pkg.name, pkg.totalCredits, pkg.price);
                } else {
                    updatedProfile = await purchaseCreditRefill(user.uid, pkg.totalCredits, pkg.price);
                }
                
                onSuccess(updatedProfile as User, pkg.totalCredits);
            } catch (error: any) {
                console.error("Failed to process purchase:", error);
                onError("Payment successful but account update failed. Please contact support@magicpixa.com");
            }
        },
        prefill: {
            name: user.name,
            email: user.email
        },
        theme: {
            color: "#4D7CFF"
        },
        modal: {
            ondismiss: () => {
                onCancel();
            }
        }
    };

    try {
        const rzp = new window.Razorpay(checkoutConfig);
        rzp.open();
    } catch (error: any) {
        console.error("Error opening Razorpay:", error);
        onError("Could not initiate payment.");
    }
};