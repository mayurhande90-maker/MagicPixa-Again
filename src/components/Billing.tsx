import React, { useState, useEffect } from 'react';
import { User, Transaction } from '../types';
import { purchaseTopUp, getCreditHistory } from '../firebase';
import { 
    SparklesIcon, CheckIcon, InformationCircleIcon, TicketIcon, XIcon, PlusCircleIcon, 
    PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, MockupIcon
} from './icons';

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

  const getIconForFeature = (feature: string): React.ReactNode => {
    const iconClass = "w-5 h-5";
    if (feature.toLowerCase().includes('purchase')) {
        return <div className="p-2 bg-green-100 rounded-full"><PlusCircleIcon className={`${iconClass} text-green-600`} /></div>;
    }
    
    const featureIconMap: { [key: string]: React.ReactNode } = {
        'Magic Photo Studio': <div className="p-2 bg-blue-100 rounded-full"><PhotoStudioIcon className={`${iconClass} text-blue-600`} /></div>,
        'Magic Soul': <div className="p-2 bg-pink-100 rounded-full"><UsersIcon className={`${iconClass} text-pink-600`} /></div>,
        'Magic Photo Colour': <div className="p-2 bg-rose-100 rounded-full"><PaletteIcon className={`${iconClass} text-rose-600`} /></div>,
        'CaptionAI': <div className="p-2 bg-amber-100 rounded-full"><CaptionIcon className={`${iconClass} text-amber-600`} /></div>,
        'Magic Interior': <div className="p-2 bg-orange-100 rounded-full"><HomeIcon className={`${iconClass} text-orange-600`} /></div>,
        'Magic Apparel': <div className="p-2 bg-teal-100 rounded-full"><UsersIcon className={`${iconClass} text-teal-600`} /></div>,
        'Magic Mockup': <div className="p-2 bg-indigo-100 rounded-full"><MockupIcon className={`${iconClass} text-indigo-600`} /></div>,
    };
    
    const matchingKey = Object.keys(featureIconMap).find(key => feature.includes(key));
    if (matchingKey) {
        return featureIconMap[matchingKey];
    }

    return <div className="p-2 bg-gray-100 rounded-full"><TicketIcon className={`${iconClass} text-gray-500`} /></div>;
  };

  const groupTransactionsByDate = (transactions: Transaction[]) => {
      const groups: { [key: string]: Transaction[] } = {};
      if (!transactions || transactions.length === 0) return groups;
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      transactions.forEach(tx => {
          if (!tx.date) return;
          const date = tx.date.toDate();
          let key;

          if (date.toDateString() === today.toDateString()) {
              key = 'Today';
          } else if (date.toDateString() === yesterday.toDateString()) {
              key = 'Yesterday';
          } else {
              key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          }
          
          if (!groups[key]) {
              groups[key] = [];
          }
          groups[key].push(tx);
      });

      return groups;
  };

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
  const groupedTransactions = groupTransactionsByDate(transactions);


  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
        <div className='mb-8 text-center lg:text-left'>
          <h2 className="text-3xl font-bold text-[#1E1E1E]">Billing & Credits</h2>
          <p className="text-[#5F6368] mt-1">Top up your credits or review your usage history.</p>
        </div>

        <div className="bg-gradient-to-br from-[#0079F2] to-indigo-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden mb-8">
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full opacity-50"></div>
            <div className="absolute bottom-[-50px] left-[-20px] w-48 h-48 bg-white/10 rounded-full opacity-50"></div>
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Credit Overview</h3>
                    <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{user.plan} Plan</span>
                </div>
                <div>
                    <p className="text-5xl font-bold">{user.credits}</p>
                    <p className="text-indigo-200">Available Credits</p>
                </div>
                <div className="mt-4">
                    <div className="w-full bg-white/20 rounded-full h-2">
                        <div className="bg-white h-2 rounded-full" style={{ width: `${creditPercentage}%` }}></div>
                    </div>
                     <p className="text-xs text-indigo-200 mt-1 text-right">
                        {user.credits > maxCreditsForMeter ? `Over ${maxCreditsForMeter} credits` : `${user.credits} / ${maxCreditsForMeter}`}
                    </p>
                </div>
            </div>
        </div>

        <div className="mb-12">
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-[#1E1E1E] mb-2">Recharge Your Creative Energy</h3>
                <p className="text-lg text-[#5F6368]">Choose a credit pack that fits your needs. No subscriptions.</p>
            </div>
          
            <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
                {creditPacks.map((pack, index) => (
                    <div key={index} className={`relative bg-white p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${pack.popular ? 'border-[#0079F2] shadow-lg shadow-blue-500/10' : 'border-gray-200/80 hover:border-blue-300'}`}>
                        {pack.popular && <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-[#0079F2] text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Best Value</div>}
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-800">{pack.name}</h3>
                            <p className="text-2xl font-bold text-[#0079F2] my-1">{pack.totalCredits} <span className="text-base font-medium text-gray-500">Credits</span></p>
                            {pack.bonus > 0 && <p className="text-xs font-semibold text-green-600">{pack.credits} + {pack.bonus} Bonus!</p>}
                            <p className="text-xs text-gray-500 mt-2">₹{pack.value.toFixed(2)} per credit</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <p className="text-2xl font-bold text-gray-800 mb-2">₹{pack.price}</p>
                            <button
                                onClick={() => handlePurchase(pack, index)}
                                disabled={loadingPackage !== null}
                                className={`w-24 font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-wait text-sm ${
                                pack.popular
                                    ? 'bg-[#0079F2] text-white hover:bg-blue-700'
                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                }`}
                            >
                                {loadingPackage === index ? (
                                <svg className="animate-spin h-5 w-5 mx-auto text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                'Buy'
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-[#1E1E1E]">Credit Usage History</h3>
                <button onClick={() => setIsInfoModalOpen(true)} className="text-gray-400 hover:text-[#0079F2]">
                    <InformationCircleIcon className="w-6 h-6"/>
                </button>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200/80">
                {isLoadingHistory ? (
                    <p className="text-sm text-gray-500 text-center py-4">Loading history...</p>
                ) : Object.keys(groupedTransactions).length > 0 ? (
                    Object.entries(groupedTransactions).map(([date, txs]) => (
                        <div key={date}>
                            <h4 className="text-sm font-semibold text-gray-500 my-3 px-2">{date}</h4>
                            <div className="space-y-1">
                                {txs.map((tx) => (
                                     <div key={tx.id} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            {getIconForFeature(tx.feature)}
                                            <div>
                                                 <p className="font-bold text-gray-800">{tx.feature}</p>
                                                 <p className="text-xs text-gray-500">{tx.date.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                         {tx.creditChange ? (
                                             <span className="font-bold text-green-500 text-base">{tx.creditChange}</span>
                                         ) : (
                                             <span className="font-bold text-red-500 text-base">-{tx.cost} cr</span>
                                         )}
                                     </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
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
