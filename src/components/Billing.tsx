import React, { useState, useEffect } from 'react';
import { User, Transaction } from '../types';
import { purchaseTopUp, getCreditHistory } from '../firebase';
import { SparklesIcon, CheckIcon, InformationCircleIcon, TicketIcon, XIcon } from './icons';

interface BillingProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const creditPacks = [
  {
    name: 'Starter Pack',
    price: 99,
    credits: 50,
    totalCredits: 50,
    bonus: 0,
    tagline: 'For quick tests & personal use',
    popular: false,
    value: 1.98,
  },
  {
    name: 'Creator Pack',
    price: 249,
    credits: 150,
    totalCredits: 165,
    bonus: 15,
    tagline: 'For creators & influencers — extra credits included!',
    popular: true,
    value: 1.51,
  },
  {
    name: 'Studio Pack',
    price: 699,
    credits: 500,
    totalCredits: 575,
    bonus: 75,
    tagline: 'For professional video and design teams',
    popular: false,
    value: 1.21,
  },
  {
    name: 'Agency Pack',
    price: 1199,
    credits: 1000,
    totalCredits: 1200,
    bonus: 200,
    tagline: 'For studios and agencies — biggest savings!',
    popular: false,
    value: 0.99,
  },
];

const creditCosts = [
    { feature: 'Photo Studio', cost: '2 Credits' },
    { feature: 'Magic Soul', cost: '3 Credits' },
    { feature: 'Photo Colour', cost: '2 Credits' },
    { feature: 'CaptionAI', cost: '1 Credit' },
    { feature: 'Interior AI', cost: '2 Credits' },
    { feature: 'Apparel AI', cost: '3 Credits' },
    { feature: 'Mockup AI', cost: '2 Credits' },
];

const PaymentConfirmationModal: React.FC<{ creditsAdded: number; onClose: () => void; }> = ({ creditsAdded, onClose }) => {
    return (
        <div 
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            aria-labelledby="payment-success-title"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white w-full max-w-sm m-4 p-8 rounded-2xl shadow-xl text-center">
                <div className="checkmark">
                    <svg className="w-full h-full" viewBox="0 0 52 52">
                        <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                        <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                </div>
                <h2 id="payment-success-title" className="text-2xl font-bold text-[#1E1E1E] mt-6 mb-2">Payment Successful!</h2>
                <p className="text-[#5F6368] mb-6">
                    You're all set! We've added <span className="font-bold text-[#1E1E1E]">{creditsAdded} credits</span> to your account.
                </p>
                <button
                    onClick={onClose}
                    className="w-full bg-[#0079F2] text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Continue Creating
                </button>
            </div>
        </div>
    );
};

const Billing: React.FC<BillingProps> = ({ user, setUser }) => {
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedPurchase, setConfirmedPurchase] = useState<{ totalCredits: number } | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
        if (user) {
            setIsLoadingHistory(true);
            try {
                const history = await getCreditHistory(user.uid);
                setTransactions(history as Transaction[]);
            } catch (error) {
                console.error("Failed to fetch credit history:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        }
    };
    fetchHistory();
  }, [user]);

  const handlePurchase = async (pkg: any, index: number) => {
    setLoadingPackage(index);

    if (!window.Razorpay) {
        alert("Payment gateway is not available. Please check your internet connection and refresh the page.");
        console.error("window.Razorpay is not defined. The script might be blocked or failed to load.");
        setLoadingPackage(null);
        return;
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

    if (!razorpayKey || razorpayKey === 'undefined') {
        alert("Payment gateway is not configured correctly. If you are the administrator, please ensure the VITE_RAZORPAY_KEY_ID is set in your hosting environment and that the site has been redeployed.");
        console.error("VITE_RAZORPAY_KEY_ID is not set or is 'undefined'.");
        setLoadingPackage(null);
        return;
    }

    const options = {
      key: razorpayKey,
      amount: pkg.price * 100, // Amount in paise
      currency: "INR",
      name: `MagicPixa: ${pkg.name}`,
      description: `One-time purchase of ${pkg.totalCredits} credits.`,
      image: "https://aistudio.google.com/static/img/workspace/gemini-pro-icon.svg",
      handler: async (response: any) => {
        console.log("Razorpay Response:", response);
        
        try {
            const updatedProfile = await purchaseTopUp(user.uid, pkg.name, pkg.totalCredits, pkg.price);
            setUser(prev => prev ? { ...prev, ...updatedProfile } : null);
            setConfirmedPurchase({ totalCredits: pkg.totalCredits });
            setShowConfirmation(true);
            
            try {
                const history = await getCreditHistory(user.uid);
                setTransactions(history as Transaction[]);
            } catch (historyError) {
                console.error("Purchase successful, but failed to refresh transaction history:", historyError);
            }
        } catch (error) {
            console.error("Failed to add credits after payment:", error);
            alert("Payment was successful, but there was an issue updating your credits. Please contact support.");
        } finally {
            setLoadingPackage(null);
        }
      },
      prefill: {
        name: user.name,
        email: user.email,
      },
      theme: {
        color: "#0079F2"
      },
      modal: {
        ondismiss: () => {
            setLoadingPackage(null);
        }
      }
    };

    try {
        const rzp = new window.Razorpay(options);
        rzp.open();
    } catch (error) {
        console.error("Error opening Razorpay checkout:", error);
        alert("Could not initiate payment. There might be a configuration issue. Please try again.");
        setLoadingPackage(null);
    }
  };
  
  const maxCreditsForMeter = 100;
  const creditPercentage = Math.min((user.credits / maxCreditsForMeter) * 100, 100);

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
        <div className='mb-8'>
          <h2 className="text-3xl font-bold text-[#1E1E1E]">Billing & Credits</h2>
          <p className="text-[#5F6368] mt-1">Top up your credits or review your usage history.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 mb-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-[#1E1E1E]">Your Credit Balance</h3>
                <button onClick={() => setIsInfoModalOpen(true)} className="text-gray-400 hover:text-[#0079F2]">
                    <InformationCircleIcon className="w-6 h-6"/>
                </button>
            </div>
            <div className="flex items-center sm:items-end gap-4 flex-col sm:flex-row">
                <div className="relative w-24 h-24">
                    <svg className="w-full h-full" viewBox="0 0 36 36" transform="rotate(-90)">
                        <path
                            className="text-gray-200"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                            className="text-[#0079F2] transition-all duration-500 ease-in-out"
                            strokeWidth="3.5"
                            strokeDasharray={`${creditPercentage}, 100`}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center" style={{transform: 'rotate(90deg)'}}>
                        <SparklesIcon className="w-8 h-8 text-[#f9d230]"/>
                    </div>
                </div>
                <div className="text-center sm:text-left">
                     <p className="text-5xl font-bold text-[#1E1E1E] leading-none">{user.credits}</p>
                     <p className="text-lg text-[#5F6368]">Available Credits</p>
                </div>
            </div>
        </div>

        <div className="mb-8">
            <div className="text-center mb-12">
                <h3 className="text-2xl font-bold text-[#1E1E1E] mb-2">Recharge Your Creative Energy</h3>
                <p className="text-lg text-[#5F6368]">Choose a credit pack that fits your needs. No subscriptions.</p>
            </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
            {creditPacks.map((pack, index) => (
              <div key={index} className={`relative bg-white p-6 rounded-2xl shadow-sm border-2 text-left flex flex-col transition-transform transform hover:-translate-y-2 ${pack.popular ? 'border-[#0079F2] shadow-lg shadow-blue-500/10' : 'border-gray-200/80'}`}>
                {pack.popular && <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-[#0079F2] text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Best Value</div>}
                <h3 className="text-xl font-bold text-[#1E1E1E] mb-2">{pack.name}</h3>
                <p className="text-[#5F6368] text-sm mb-4 h-10">{pack.tagline}</p>
                
                <div className="my-2 text-center">
                    <span className="text-5xl font-bold text-[#1E1E1E]">
                        {pack.totalCredits}
                    </span>
                    <span className="text-lg text-[#5F6368] ml-1">Credits</span>
                </div>

                {pack.bonus > 0 && (
                    <p className="text-sm font-semibold text-emerald-500 mb-4 text-center">
                        ({pack.credits} + {pack.bonus} Bonus!)
                    </p>
                )}
                
                <div className="flex-grow"></div>

                <div className="bg-gray-50 border border-gray-200/80 rounded-lg p-3 text-center mb-6 mt-4">
                    <span className="text-3xl font-bold text-[#1E1E1E]">₹{pack.price}</span>
                    <p className="text-xs text-gray-500">One-time payment</p>
                </div>

                <button
                    onClick={() => handlePurchase(pack, index)}
                    disabled={loadingPackage !== null}
                    className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-wait ${
                    pack.popular
                        ? 'bg-[#0079F2] text-white hover:bg-blue-700'
                        : 'bg-[#f9d230] hover:scale-105 text-[#1E1E1E]'
                    }`}
                >
                    {loadingPackage === index ? (
                      <svg className="animate-spin h-5 w-5 mx-auto text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      'Buy Now'
                    )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
            <h3 className="text-xl font-bold text-[#1E1E1E] mb-4">Credit Usage History</h3>
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 space-y-3">
                {isLoadingHistory ? (
                    <p className="text-sm text-gray-500 text-center py-4">Loading history...</p>
                ) : transactions.length > 0 ? transactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-50">
                       <div className="flex items-center gap-3">
                           <div className="p-2 bg-gray-100 rounded-full">
                               <TicketIcon className="w-5 h-5 text-gray-500"/>
                           </div>
                           <div>
                                <p className="font-semibold text-[#1E1E1E]">{tx.feature}</p>
                                <p className="text-xs text-gray-500">{tx.date.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                           </div>
                       </div>
                        {tx.creditChange ? (
                            <span className="font-bold text-green-500">{tx.creditChange}</span>
                        ) : (
                            <span className="font-bold text-red-500">-{tx.cost}</span>
                        )}
                    </div>
                )) : (
                    <p className="text-sm text-gray-500 text-center py-4">No recent transactions.</p>
                )}
            </div>
        </div>
      </div>
      
      {isInfoModalOpen && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setIsInfoModalOpen(false)}
          >
              <div 
                className="relative bg-white w-full max-w-md m-4 p-6 rounded-2xl shadow-xl border border-gray-200/80"
                onClick={e => e.stopPropagation()}
              >
                  <button 
                    onClick={() => setIsInfoModalOpen(false)} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                  >
                      <XIcon className="w-6 h-6"/>
                  </button>
                  <h3 className="text-lg font-bold text-[#1E1E1E] mb-4">How Credits Work</h3>
                  <p className="text-sm text-gray-600 mb-4">
                      Each feature in MagicPixa uses a certain amount of credits. Here is a quick breakdown of the costs per generation:
                  </p>
                  <div className="space-y-2">
                      {creditCosts.map(item => (
                          <div key={item.feature} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg text-sm">
                              <span className="text-gray-700">{item.feature}</span>
                              <span className="font-bold text-[#1E1E1E]">{item.cost}</span>
                          </div>
                      ))}
                  </div>
                  <button 
                    onClick={() => setIsInfoModalOpen(false)}
                    className="w-full mt-6 bg-[#0079F2] text-white font-semibold py-2.5 rounded-lg"
                  >
                      Got it
                  </button>
              </div>
          </div>
      )}
      {showConfirmation && confirmedPurchase && (
        <PaymentConfirmationModal
            creditsAdded={confirmedPurchase.totalCredits}
            onClose={() => setShowConfirmation(false)}
        />
      )}
    </>
  );
};

export default Billing;