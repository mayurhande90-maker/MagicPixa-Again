
import React, { useState, useEffect } from 'react';
import { User, Transaction, AppConfig, CreditPack, View } from '../types';
import { purchaseTopUp, getCreditHistory } from '../firebase';
import { 
    SparklesIcon, CheckIcon, TicketIcon, XIcon, PlusCircleIcon, 
    PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, MockupIcon, ApparelIcon, ThumbnailIcon, BuildingIcon,
    PixaEcommerceIcon, MagicAdsIcon, PixaTogetherIcon, PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon, PixaMockupIcon,
    CreditCoinIcon, PixaHeadshotIcon
} from './icons';
import { BillingStyles } from '../styles/Billing.styles';

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

  const getIconForFeature = (feature: string): React.ReactNode => {
    const iconClass = "w-5 h-5";
    if (feature === 'MagicPixa Credit Grant' || feature.toLowerCase().includes('purchase') || feature.toLowerCase().includes('grant')) {
        return <div className="p-2 bg-green-100 rounded-full"><PlusCircleIcon className={`${iconClass} text-green-600`} /></div>;
    }
    
    if (feature.includes('Product') || feature.includes('Model')) return <PhotoStudioIcon className="w-10 h-10" />;
    if (feature.includes('Thumbnail')) return <ThumbnailIcon className="w-10 h-10" />;
    if (feature.includes('Realty')) return <BuildingIcon className="w-10 h-10" />; 
    if (feature.includes('Ecommerce') || feature.includes('Merchant')) return <PixaEcommerceIcon className="w-10 h-10" />;
    if (feature.includes('AdMaker') || feature.includes('Ads')) return <MagicAdsIcon className="w-10 h-10" />;
    if (feature.includes('Together') || feature.includes('Soul')) return <PixaTogetherIcon className="w-10 h-10" />;
    if (feature.includes('Restore') || feature.includes('Colour')) return <PixaRestoreIcon className="w-10 h-10" />;
    if (feature.includes('Caption')) return <PixaCaptionIcon className="w-10 h-10" />;
    if (feature.includes('Interior')) return <PixaInteriorIcon className="w-10 h-10" />;
    if (feature.includes('TryOn') || feature.includes('Apparel')) return <PixaTryOnIcon className="w-10 h-10" />;
    if (feature.includes('Mockup')) return <PixaMockupIcon className="w-10 h-10" />;
    if (feature.includes('Headshot')) return <PixaHeadshotIcon className="w-10 h-10" />;
    
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
        setLoadingPackage(null);
        return;
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

    if (!razorpayKey || razorpayKey === 'undefined') {
        alert("Payment gateway configuration error.");
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
        try {
            const updatedProfile = await purchaseTopUp(user.uid, pkg.name, pkg.totalCredits, pkg.price);
            setUser(prev => prev ? { ...prev, ...updatedProfile } : null);
            setConfirmedPurchase({ totalCredits: pkg.totalCredits });
            setShowConfirmation(true);
            
            try {
                const history = await getCreditHistory(user.uid);
                setTransactions(history as Transaction[]);
            } catch (historyError) { console.error(historyError); }
        } catch (error) {
            console.error("Failed to add credits after payment:", error);
            alert("Payment successful but credit update failed. Contact support.");
        } finally {
            setLoadingPackage(null);
        }
      },
      prefill: { name: user.name, email: user.email },
      theme: { color: "#4D7CFF" },
      modal: { ondismiss: () => setLoadingPackage(null) }
    };

    try {
        const rzp = new window.Razorpay(options);
        rzp.open();
    } catch (error) {
        console.error("Error opening Razorpay:", error);
        alert("Could not initiate payment.");
        setLoadingPackage(null);
    }
  };
  
  const getTotalAcquired = (currentUser: User) => {
    const current = currentUser.credits || 0;
    if (currentUser.totalCreditsAcquired && currentUser.totalCreditsAcquired >= current) {
        return currentUser.totalCreditsAcquired;
    }
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

  const displayPlanName = user.plan === 'Free' ? 'Free Plan' : (user.plan || 'Free Plan');

  return (
    <>
      <div className={BillingStyles.container}>
        <div className='mb-10 text-center sm:text-left'>
          <h2 className={BillingStyles.headerTitle}>Billing & Credits</h2>
          <p className={BillingStyles.headerSubtitle}>Manage your subscription and credit usage.</p>
        </div>

        <div className={BillingStyles.creditCard}>
            <div className={BillingStyles.creditCardDecor1}></div>
            <div className={BillingStyles.creditCardDecor2}></div>
            
            <div className={BillingStyles.creditCardContent}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl">Credit Overview</h3>
                    <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {displayPlanName}
                    </span>
                </div>
                <div>
                    <p className={BillingStyles.creditBigNumber}>{currentCredits}</p>
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
          
            <div className={BillingStyles.packGrid}>
                {creditPacks.map((pack, index) => (
                    <div key={index} className={`${BillingStyles.packCard} ${pack.popular ? BillingStyles.packCardPopular : BillingStyles.packCardStandard}`}>
                        {pack.popular && <p className="text-center bg-[#F9D230] text-[#1A1A1E] text-xs font-bold px-3 py-1 rounded-full uppercase -mt-9 mb-4 mx-auto">Best Value</p>}
                        <h3 className={BillingStyles.packTitle}>{pack.name}</h3>
                        <p className="text-[#5F6368] text-sm mb-4 h-10">{pack.tagline}</p>
                        
                        <div className="my-2">
                            <span className="text-4xl font-bold text-[#1A1A1E]">{pack.totalCredits}</span>
                            <span className="text-[#5F6368] ml-1">Credits</span>
                        </div>
                        <div className="h-5 mb-4">
                          {pack.bonus > 0 && (
                              <p className="text-sm font-semibold text-[#6EFACC] text-emerald-500">
                                  {pack.credits} + {pack.bonus} Bonus!
                              </p>
                          )}
                        </div>
                        
                        <div className="bg-gray-50 border border-gray-200/80 rounded-lg p-3 text-center mb-6">
                            <span className={BillingStyles.packPrice}>₹{pack.price}</span>
                            <p className="text-xs text-gray-500">One-time payment</p>
                        </div>
                        
                        <button 
                            onClick={() => handlePurchase(pack, index)}
                            disabled={loadingPackage !== null}
                            className={`${BillingStyles.packButton} ${pack.popular ? BillingStyles.packButtonPopular : BillingStyles.packButtonStandard}`}
                        >
                            {loadingPackage === index ? (
                                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                            ) : (
                                "Buy Now"
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>

        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#1A1A1E]">Transaction History</h3>
            </div>
            <div className={BillingStyles.historyContainer}>
                {isLoadingHistory ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
                    </div>
                ) : sortedGroupKeys.length > 0 ? (
                    <div className="relative">
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar px-2">
                            {sortedGroupKeys.map((date) => (
                                <div key={date} className="mb-6 last:mb-0">
                                    <h4 className={BillingStyles.historyDateGroup}>{date}</h4>
                                    <div className="space-y-1">
                                        {groupedTransactions[date].map((tx) => (
                                             <div key={tx.id} className={BillingStyles.historyItem}>
                                                <div className="flex items-center gap-4">
                                                    <div className="group-hover:scale-110 transition-transform duration-300">
                                                        {getIconForFeature(tx.feature)}
                                                    </div>
                                                    <div>
                                                         {/* Transaction details display logic */}
                                                         {tx.feature === 'MagicPixa Credit Grant' ? (
                                                             <>
                                                                <p className="font-bold text-gray-800">{tx.reason}</p>
                                                                <p className="text-[10px] font-medium text-gray-400 mt-0.5">MagicPixa Grant</p>
                                                             </>
                                                         ) : (
                                                             <>
                                                                <p className="font-bold text-gray-800">
                                                                    {/* Simplified feature mapping for display */}
                                                                    {tx.feature.replace('Admin Grant', 'MagicPixa Grant')}
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
