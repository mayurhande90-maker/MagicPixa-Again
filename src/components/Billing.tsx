
import React, { useState, useEffect } from 'react';
import { User, Transaction, AppConfig, CreditPack, View } from '../types';
import { purchaseTopUp, getCreditHistory } from '../firebase';
import { 
    SparklesIcon, CheckIcon, InformationCircleIcon, TicketIcon, XIcon, PlusCircleIcon, 
    PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, MockupIcon, ApparelIcon, ThumbnailIcon, BuildingIcon,
    PixaEcommerceIcon, MagicAdsIcon, PixaTogetherIcon, PixaRestoreIcon, PixaCaptionIcon
} from './icons';

interface BillingProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  appConfig: AppConfig | null;
  setActiveView: (view: View) => void;
}

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
                <h2 id="payment-success-title" className="text-2xl font-bold text-[#1A1A1E] mt-6 mb-2">Payment Successful!</h2>
                <p className="text-[#5F6368] mb-6">
                    You're all set! We've added <span className="font-bold text-[#1A1A1E]">{creditsAdded} credits</span> to your account.
                </p>
                <button
                    onClick={onClose}
                    className="w-full bg-[#F9D230] text-[#1A1A1E] font-semibold py-3 rounded-lg hover:bg-[#dfbc2b] transition-colors"
                >
                    Start Creating
                </button>
            </div>
        </div>
    );
};

export const Billing: React.FC<BillingProps> = ({ user, setUser, appConfig, setActiveView }) => {
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedPurchase, setConfirmedPurchase] = useState<{ totalCredits: number } | null>(null);

  // Default credit packs if appConfig fails to load or is empty
  const defaultCreditPacks: CreditPack[] = [
    { name: 'Starter Pack', price: 99, credits: 50, totalCredits: 50, bonus: 0, tagline: 'For quick tests & personal use', popular: false, value: 1.98 },
    { name: 'Creator Pack', price: 249, credits: 150, totalCredits: 165, bonus: 15, tagline: 'For creators & influencers — extra credits included!', popular: true, value: 1.51 },
    { name: 'Studio Pack', price: 699, credits: 500, totalCredits: 575, bonus: 75, tagline: 'For professional video and design teams', popular: false, value: 1.21 },
    { name: 'Agency Pack', price: 1199, credits: 1000, totalCredits: 1200, bonus: 200, tagline: 'For studios and agencies — biggest savings!', popular: false, value: 0.99 },
  ];

  const creditPacks = appConfig?.creditPacks && appConfig.creditPacks.length > 0 
    ? appConfig.creditPacks 
    : defaultCreditPacks;

  const creditCosts = appConfig?.featureCosts ? Object.entries(appConfig.featureCosts).map(([feature, cost]) => ({ feature, cost: `${cost} Credits` })) : [];

  const getIconForFeature = (feature: string): React.ReactNode => {
    const iconClass = "w-5 h-5";
    if (feature === 'MagicPixa Credit Grant' || feature.toLowerCase().includes('purchase') || feature.toLowerCase().includes('grant')) {
        return <div className="p-2 bg-green-100 rounded-full"><PlusCircleIcon className={`${iconClass} text-green-600`} /></div>;
    }
    
    // Explicitly check for Magic Photo Studio / Pixa Product Shots / Pixa Model Shot first to return the standalone icon
    if (feature.includes('Magic Photo Studio') || feature.includes('Pixa Product Shots') || feature.includes('Pixa Model Shot') || feature.includes('Pixa Model Shots') || feature === 'Model Shot') {
        return <PhotoStudioIcon className="w-10 h-10" />;
    }

    // Explicit check for Pixa Thumbnail Pro
    if (feature.includes('Thumbnail Studio') || feature.includes('Pixa Thumbnail Pro')) {
        return <ThumbnailIcon className="w-10 h-10" />;
    }

    // Explicit check for Pixa Realty Ads (Standalone icon mode)
    if (feature.includes('Magic Realty') || feature.includes('Pixa Realty Ads')) {
        return <BuildingIcon className="w-10 h-10" />; 
    }

    // Explicit check for Pixa Ecommerce Kit
    if (feature.includes('Pixa Ecommerce Kit') || feature.includes('Merchant Studio') || feature.includes('Ecommerce Kit')) {
        return <PixaEcommerceIcon className="w-10 h-10" />;
    }

    // Explicit check for Pixa AdMaker (including legacy names)
    if (feature.includes('Pixa AdMaker') || feature.includes('Magic Ads') || feature.includes('Brand Stylist')) {
        return <MagicAdsIcon className="w-10 h-10" />;
    }

    // Explicit check for Pixa Together (including legacy Magic Soul)
    if (feature.includes('Pixa Together') || feature.includes('Magic Soul')) {
        return <PixaTogetherIcon className="w-10 h-10" />;
    }

    // Explicit check for Pixa Photo Restore
    if (feature.includes('Pixa Photo Restore') || feature.includes('Magic Photo Colour')) {
        return <PixaRestoreIcon className="w-10 h-10" />;
    }

    // Explicit check for Pixa Caption Pro (including legacy CaptionAI)
    if (feature.includes('Pixa Caption Pro') || feature.includes('CaptionAI')) {
        return <PixaCaptionIcon className="w-10 h-10" />;
    }
    
    const featureIconMap: { [key: string]: React.ReactNode } = {
        'Magic Interior': <div className="p-2 bg-orange-100 rounded-full"><HomeIcon className={`${iconClass} text-orange-600`} /></div>,
        'Magic Apparel': <div className="p-2 bg-blue-100 rounded-full"><ApparelIcon className={`${iconClass} text-blue-600`} /></div>,
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
          // Handle both Firestore Timestamp and regular Date objects/strings
          const date = (tx.date as any).toDate ? (tx.date as any).toDate() : new Date((tx.date as any).seconds * 1000 || tx.date);
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
        color: "#4D7CFF"
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
  
  const getTotalAcquired = (currentUser: User) => {
    const current = currentUser.credits || 0;
    // If the field exists and is valid (not less than current credits), use it.
    if (currentUser.totalCreditsAcquired && currentUser.totalCreditsAcquired >= current) {
        return currentUser.totalCreditsAcquired;
    }
    // Otherwise, create a sensible fallback ceiling.
    return Math.max(10, Math.ceil(current / 50) * 50);
  };

  const currentCredits = user.credits || 0;
  const maxCreditsForMeter = getTotalAcquired(user);
  const creditPercentage = maxCreditsForMeter > 0 ? Math.min((currentCredits / maxCreditsForMeter) * 100, 100) : 0;
  const groupedTransactions = groupTransactionsByDate(transactions);

  const sortedGroupKeys = Object.keys(groupedTransactions).sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    if (a === 'Yesterday') return -1;
    if (b === 'Yesterday') return 1;
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  });

  // Safe Plan Display Logic: Handles "Plan Plan" duplication and new "Top-up" format
  const displayPlanName = (() => {
      const planName = user.plan || 'Free';
      // Only append "Plan" if it's the default Free tier
      if (planName === 'Free') return 'Free Plan';
      // Otherwise return as is (e.g. "Starter Pack", "Studio Pack | Top-up")
      return planName;
  })();

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 pb-20 w-full max-w-7xl mx-auto">
        <div className='mb-10 text-center sm:text-left'>
          <h2 className="text-3xl font-bold text-[#1A1A1E]">Billing & Credits</h2>
          <p className="text-lg text-[#5F6368] mt-2">Manage your subscription and credit usage.</p>
        </div>

        {/* Restored Rectangular Design - Increased padding to fix clipping */}
        <div className="bg-gradient-to-br from-[#4D7CFF] to-indigo-600 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden mb-12">
            <div className="absolute -top-4 -right-4 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl">Credit Overview</h3>
                    <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {displayPlanName}
                    </span>
                </div>
                <div>
                    <p className="text-7xl font-black">{currentCredits}</p>
                    <p className="text-indigo-200 font-medium mt-1">Available Credits</p>
                </div>
                <div className="mt-8">
                    <div className="flex justify-between text-xs font-bold text-indigo-100 mb-2 uppercase tracking-wide">
                         <span>Usage</span>
                         <span>{currentCredits} / {maxCreditsForMeter}</span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-4 overflow-hidden backdrop-blur-sm border border-white/10">
                        <div className="bg-[#6EFACC] h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_#6EFACC]" style={{ width: `${creditPercentage}%` }}></div>
                    </div>
                </div>
            </div>
        </div>

        <div className="mb-16">
            <div className="text-center mb-10">
                <h3 className="text-2xl font-bold text-[#1A1A1E] mb-2">Recharge Your Creative Energy</h3>
                <p className="text-lg text-[#5F6368]">Choose a credit pack that fits your needs. No subscriptions.</p>
            </div>
          
            <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0 lg:grid-cols-4">
                {creditPacks.map((pack, index) => (
                    <div key={index} className={`relative bg-white p-6 rounded-2xl border-2 flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-lg ${pack.popular ? 'border-[#F9D230] shadow-md shadow-yellow-500/10' : 'border-gray-100 hover:border-blue-200'}`}>
                        {pack.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F9D230] text-[#1A1A1E] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">Best Value</div>}
                        
                        <div className="flex-1 text-center">
                            <h3 className="font-bold text-lg text-gray-800 mb-1">{pack.name}</h3>
                            <p className="text-xs text-gray-400 mb-4 line-clamp-1">{pack.tagline}</p>
                            
                            <div className="mb-2">
                                <span className="text-4xl font-black text-[#1A1A1E]">{pack.totalCredits}</span>
                                <span className="text-sm font-bold text-gray-400 ml-1">CR</span>
                            </div>
                            
                            <div className="h-6 mb-4">
                                {pack.bonus > 0 ? (
                                    <span className="inline-block bg-green-50 text-green-600 text-xs font-bold px-2 py-1 rounded-md border border-green-100">
                                        +{pack.bonus} Bonus Credits
                                    </span>
                                ) : (
                                    <span className="inline-block py-1">&nbsp;</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-100 text-center">
                             <p className="text-2xl font-bold text-[#1A1A1E] mb-3">₹{pack.price}</p>
                             <button
                                onClick={() => handlePurchase(pack, index)}
                                disabled={loadingPackage !== null}
                                className={`w-full font-bold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-wait text-sm ${
                                pack.popular
                                    ? 'bg-[#1A1A1E] text-white hover:bg-black hover:shadow-lg'
                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                }`}
                            >
                                {loadingPackage === index ? (
                                <svg className="animate-spin h-5 w-5 mx-auto text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                'Buy Now'
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#1A1A1E]">Transaction History</h3>
                <button onClick={() => setIsInfoModalOpen(true)} className="text-gray-400 hover:text-[#4D7CFF] transition-colors p-2 hover:bg-gray-100 rounded-full">
                    <InformationCircleIcon className="w-6 h-6"/>
                </button>
            </div>
            <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-sm">
                {isLoadingHistory ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
                    </div>
                ) : sortedGroupKeys.length > 0 ? (
                    <div className="relative">
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar px-2">
                            {sortedGroupKeys.map((date) => (
                                <div key={date} className="mb-6 last:mb-0">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 mt-4 ml-2 sticky top-0 bg-white z-10 py-2">{date}</h4>
                                    <div className="space-y-1">
                                        {groupedTransactions[date].map((tx) => (
                                             <div key={tx.id} className="flex justify-between items-center text-sm p-3 rounded-xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100">
                                                <div className="flex items-center gap-4">
                                                    <div className="group-hover:scale-110 transition-transform duration-300">
                                                        {getIconForFeature(tx.feature)}
                                                    </div>
                                                    <div>
                                                         {/* Custom Logic for Credit Grant Display */}
                                                         {tx.feature === 'MagicPixa Credit Grant' ? (
                                                             <>
                                                                <p className="font-bold text-gray-800">{tx.reason}</p>
                                                                <p className="text-[10px] font-medium text-gray-400 mt-0.5">MagicPixa Grant</p>
                                                             </>
                                                         ) : (
                                                             <>
                                                                <p className="font-bold text-gray-800">
                                                                    {(tx.feature === 'Model Shot' || tx.feature === 'Pixa Model Shot' || tx.feature === 'Pixa Model Shots')
                                                                        ? 'Pixa Model Shots' 
                                                                        : (tx.feature === 'Thumbnail Studio' || tx.feature.includes('Thumbnail Studio') || tx.feature.includes('Pixa Thumbnail Pro')
                                                                            ? 'Pixa Thumbnail Pro'
                                                                            : (tx.feature === 'Magic Realty' || tx.feature.includes('Pixa Realty Ads')
                                                                                ? 'Pixa Realty Ads'
                                                                                : (tx.feature.includes('Merchant Studio') || tx.feature.includes('Ecommerce Kit')
                                                                                    ? 'Pixa Ecommerce Kit'
                                                                                    : (tx.feature.includes('Magic Ads') || tx.feature.includes('Pixa AdMaker') || tx.feature.includes('Brand Stylist')
                                                                                        ? 'Pixa AdMaker'
                                                                                        : (tx.feature.includes('Magic Soul') || tx.feature.includes('Pixa Together')
                                                                                            ? 'Pixa Together'
                                                                                            : (tx.feature.includes('Pixa Caption Pro') || tx.feature.includes('CaptionAI')
                                                                                                ? 'Pixa Caption Pro'
                                                                                                : tx.feature.replace('Admin Grant', 'MagicPixa Grant')))))))}
                                                                </p>
                                                                <p className="text-[10px] font-medium text-gray-400 mt-0.5">{(tx.date as any).toDate ? (tx.date as any).toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : new Date((tx.date as any).seconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                                                             </>
                                                         )}
                                                    </div>
                                                </div>
                                                 {tx.creditChange ? (
                                                     <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs border border-green-100">{tx.creditChange}</span>
                                                 ) : (
                                                     <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-md text-xs">-{tx.cost}</span>
                                                 )}
                                             </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white pointer-events-none"></div>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <TicketIcon className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-400 text-sm">No transactions yet.</p>
                    </div>
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
                className="relative bg-white w-full max-w-md m-4 p-8 rounded-3xl shadow-2xl border border-gray-100"
                onClick={e => e.stopPropagation()}
              >
                  <button 
                    onClick={() => setIsInfoModalOpen(false)} 
                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all"
                    aria-label="Close"
                  >
                      <XIcon className="w-5 h-5"/>
                  </button>
                  <h3 className="text-xl font-bold text-[#1A1A1E] mb-2">Credit Costs</h3>
                  <p className="text-sm text-gray-500 mb-6">
                      Cost per generation for each AI tool.
                  </p>
                  <div className="space-y-3">
                      {creditCosts.map(item => (
                          <div key={item.feature} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl text-sm border border-gray-100">
                              <span className="text-gray-600 font-medium">{item.feature}</span>
                              <span className="font-bold text-[#1A1A1E] bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-sm">{item.cost}</span>
                          </div>
                      ))}
                  </div>
                  <button 
                    onClick={() => setIsInfoModalOpen(false)}
                    className="w-full mt-8 bg-[#1A1A1E] text-white font-bold py-3 rounded-xl hover:bg-black transition-colors"
                  >
                      Understood
                  </button>
              </div>
          </div>
      )}
      {showConfirmation && confirmedPurchase && (
        <PaymentConfirmationModal
            creditsAdded={confirmedPurchase.totalCredits}
            onClose={() => {
                setShowConfirmation(false);
                setActiveView('home_dashboard');
            }}
        />
      )}
    </>
  );
};