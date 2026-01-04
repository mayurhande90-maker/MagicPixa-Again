import React, { useState, useEffect } from 'react';
import { User, Transaction, AppConfig, CreditPack, View } from '../types';
import { getCreditHistory } from '../firebase';
import { 
    SparklesIcon, CheckIcon, TicketIcon, XIcon, PlusCircleIcon, 
    PixaProductIcon, ThumbnailIcon, BuildingIcon,
    PixaEcommerceIcon, MagicAdsIcon, PixaTogetherIcon, PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon, PixaMockupIcon,
    CreditCoinIcon, PixaHeadshotIcon, LightningIcon, MagicWandIcon, CampaignStudioIcon
} from './icons';
import { BillingStyles } from '../styles/Billing.styles';
import { triggerCheckout } from '../services/paymentService';
import { PaymentSuccessModal } from './PaymentSuccessModal';

interface BillingProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  appConfig: AppConfig | null;
  setActiveView: (view: View) => void;
}

// Plan Hierarchy Definition
const PLAN_WEIGHTS: Record<string, number> = {
    'Free': 0,
    'Starter Pack': 1,
    'Creator Pack': 2,
    'Studio Pack': 3,
    'Agency Pack': 4
};

export const Billing: React.FC<BillingProps> = ({ user, setUser, appConfig, setActiveView }) => {
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [successCredits, setSuccessCredits] = useState<number | null>(null);
  const [successPackName, setSuccessPackName] = useState<string>('');

  const defaultCreditPacks: CreditPack[] = [
    { name: 'Starter Pack', price: 99, credits: 50, totalCredits: 50, bonus: 0, tagline: '1 Brand Kit included. For personal use.', popular: false, value: 1.98 },
    { name: 'Creator Pack', price: 249, credits: 150, totalCredits: 165, bonus: 15, tagline: '3 Brand Kits. For creators & influencers.', popular: true, value: 1.51 },
    { name: 'Studio Pack', price: 699, credits: 500, totalCredits: 575, bonus: 75, tagline: '10 Brand Kits. For professional teams.', popular: false, value: 1.21 },
    { name: 'Agency Pack', price: 1199, credits: 1000, totalCredits: 1200, bonus: 200, tagline: '50 Brand Kits. For high volume agencies.', popular: false, value: 0.99 },
  ];

  const refillPacks = [
    { credits: 20, price: 49, label: 'Mini Boost', color: 'from-blue-400 to-blue-600', iconColor: 'text-blue-200' },
    { credits: 150, price: 299, label: 'Power Pack', color: 'from-purple-400 to-purple-600', iconColor: 'text-purple-200' },
    { credits: 500, price: 899, label: 'Mega Tank', color: 'from-amber-400 to-orange-500', iconColor: 'text-amber-200' }
  ];

  const creditPacks = appConfig?.creditPacks && appConfig.creditPacks.length > 0 
    ? appConfig.creditPacks 
    : defaultCreditPacks;

  const currentPlanWeight = PLAN_WEIGHTS[user.plan || 'Free'] || 0;

  const getIconForFeature = (feature: string): React.ReactNode => {
    const iconClass = "w-10 h-10";
    const bgIconClass = "w-5 h-5";
    
    if (feature === 'MagicPixa Credit Grant' || feature.toLowerCase().includes('purchase') || feature.toLowerCase().includes('grant') || feature.includes('Refill')) {
        return <div className="p-2 bg-yellow-100 rounded-full"><LightningIcon className={`${bgIconClass} text-yellow-600`} /></div>;
    }
    
    if (feature.includes('Product Shots') || feature.includes('Model Shots')) return <PixaProductIcon className={iconClass} />;
    if (feature.includes('Thumbnail Pro')) return <ThumbnailIcon className={iconClass} />;
    if (feature.includes('Realty Ads')) return <BuildingIcon className={iconClass} />; 
    if (feature.includes('Ecommerce Kit')) return <PixaEcommerceIcon className={iconClass} />;
    if (feature.includes('AdMaker')) return <MagicAdsIcon className={iconClass} />;
    if (feature.includes('Together')) return <PixaTogetherIcon className={iconClass} />;
    if (feature.includes('Photo Restore')) return <PixaRestoreIcon className={iconClass} />;
    if (feature.includes('Caption Pro')) return <PixaCaptionIcon className={iconClass} />;
    if (feature.includes('Interior Design')) return <PixaInteriorIcon className={iconClass} />;
    if (feature.includes('TryOn')) return <PixaTryOnIcon className={iconClass} />;
    if (feature.includes('Mockups')) return <PixaMockupIcon className={iconClass} />;
    if (feature.includes('Headshot Pro')) return <PixaHeadshotIcon className={iconClass} />;
    if (feature.includes('Magic Eraser') || feature.includes('Magic Editor')) return <MagicWandIcon className={iconClass} />;
    if (feature.includes('Campaign Studio')) return <CampaignStudioIcon className={iconClass} />;
    
    return <div className="p-2 bg-gray-100 rounded-full"><TicketIcon className={`${bgIconClass} text-gray-500`} /></div>;
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
          if (date.toDateString() === today.toDateString()) key = 'Today';
          else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday';
          else key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          if (!groups[key]) groups[key] = [];
          groups[key].push(tx);
      });
      return groups;
  };

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

  useEffect(() => {
    fetchHistory();
  }, [user.uid]);

  const handlePurchase = async (pkg: any, type: 'plan' | 'refill', index: number) => {
    const loadingId = `${type}-${index}`;
    setLoadingPackage(loadingId);
    
    triggerCheckout({
        user,
        pkg,
        type,
        onSuccess: (updatedProfile, totalCredits, packName) => {
            setSuccessPackName(packName);
            setSuccessCredits(totalCredits);
            setUser(updatedProfile);
            setLoadingPackage(null);
            fetchHistory(); // Refresh history
        },
        onCancel: () => setLoadingPackage(null),
        onError: (err) => {
            alert(err);
            setLoadingPackage(null);
        }
    });
  };
  
  const currentCredits = user.credits || 0;
  const maxCreditsForMeter = user.totalCreditsAcquired && user.totalCreditsAcquired >= currentCredits ? user.totalCreditsAcquired : Math.max(10, Math.ceil(currentCredits / 50) * 50);
  const creditPercentage = maxCreditsForMeter > 0 ? Math.min((currentCredits / maxCreditsForMeter) * 100, 100) : 0;
  const groupedTransactions = groupTransactionsByDate(transactions);
  const sortedGroupKeys = Object.keys(groupedTransactions).sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    if (a === 'Yesterday') return -1;
    if (b === 'Yesterday') return 1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

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
                    <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{user.plan === 'Free' ? 'Free Plan' : (user.plan || 'Free Plan')}</span>
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
                <h3 className="text-2xl font-bold text-[#1A1A1E] mb-2">Upgrade Membership</h3>
                <p className="text-lg text-[#5F6368]">Unlock higher tiers for more perks and bulk savings.</p>
            </div>
            <div className={BillingStyles.packGrid}>
                {creditPacks.map((pack, index) => {
                    const packWeight = PLAN_WEIGHTS[pack.name] || 0;
                    const isUpgrade = packWeight > currentPlanWeight;
                    const isCurrent = packWeight === currentPlanWeight;
                    const isDowngrade = packWeight < currentPlanWeight;
                    const isLoading = loadingPackage === `plan-${index}`;

                    return (
                        <div key={index} className={`${BillingStyles.packCard} ${isCurrent ? BillingStyles.packCardActive : (pack.popular && !isDowngrade ? BillingStyles.packCardPopular : BillingStyles.packCardStandard)} ${!isUpgrade && !isCurrent ? 'opacity-70 bg-gray-50' : ''}`}>
                            {isCurrent && <div className={BillingStyles.activeBadge}>Current Plan</div>}
                            {pack.popular && !isCurrent && !isDowngrade && <p className="text-center bg-[#F9D230] text-[#1A1A1E] text-xs font-bold px-3 py-1 rounded-full uppercase -mt-9 mb-4 mx-auto">Best Value</p>}
                            {isCurrent && <div className="h-2"></div>}
                            <h3 className={BillingStyles.packTitle}>{pack.name}</h3>
                            <p className="text-[#5F6368] text-sm mb-4 h-10">{pack.tagline}</p>
                            <div className="my-2"><span className="text-4xl font-bold text-[#1A1A1E]">{pack.totalCredits}</span><span className="text-[#5F6368] ml-1">Credits</span></div>
                            <div className="h-5 mb-4">{pack.bonus > 0 && (<p className="text-sm font-semibold text-emerald-500">{pack.credits} + {pack.bonus} Bonus!</p>)}</div>
                            <div className="bg-gray-50 border border-gray-200/80 rounded-lg p-3 text-center mb-6"><span className={BillingStyles.packPrice}>₹{pack.price}</span><p className="text-xs text-gray-500">One-time payment</p></div>
                            <button onClick={() => isUpgrade && handlePurchase(pack, 'plan', index)} disabled={(!isUpgrade && !isCurrent) || loadingPackage !== null} className={`${BillingStyles.packButton} ${isLoading ? 'cursor-wait opacity-80' : ''} ${isCurrent ? BillingStyles.packButtonActive : (isUpgrade ? (pack.popular && !isDowngrade ? BillingStyles.packButtonPopular : BillingStyles.packButtonStandard) : 'bg-gray-200 text-gray-500 cursor-default hover:bg-gray-200')}`}>{isLoading ? (<div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>) : (isCurrent ? (<><CheckIcon className="w-5 h-5"/> Active</>) : isDowngrade ? "Included" : "Upgrade")}</button>
                        </div>
                    );
                })}
            </div>
        </div>
        <div id="recharge-station" className="mb-16 pt-8 border-t border-gray-100">
            <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 rounded-[2rem] p-1.5 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none"></div>
                <div className="bg-[#13151A] rounded-[1.7rem] p-8 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
                    <div className="text-center lg:text-left max-w-md">
                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full mb-4"><LightningIcon className="w-4 h-4 text-[#F9D230] animate-pulse" /><span className="text-[10px] font-bold text-white uppercase tracking-widest">Instant Recharge</span></div>
                        <h3 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">Running Low on Power?</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">Top up your balance instantly without changing your membership plan. These credits never expire.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                        {refillPacks.map((pack, index) => (
                            <button key={`refill-${index}`} onClick={() => handlePurchase({ name: 'Credit Refill', price: pack.price, totalCredits: pack.credits }, 'refill', index)} disabled={loadingPackage !== null} className="group relative w-32 h-44 bg-gray-800/50 hover:bg-gray-700/50 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/30 transition-all duration-300 flex flex-col items-center justify-between p-1 overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-50/20">
                                {loadingPackage === `refill-${index}` && (<div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>)}
                                <div className="w-full h-full bg-[#1A1C23] rounded-xl flex flex-col items-center justify-between p-4 relative group-hover:bg-[#20232A] transition-colors">
                                    <div className="text-center"><div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${pack.iconColor} opacity-80 group-hover:opacity-100`}>{pack.label}</div></div>
                                    <div className="relative z-10"><span className="text-3xl font-black text-white tracking-tighter drop-shadow-md group-hover:scale-110 transition-transform duration-300 block">{pack.credits}</span><span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide block text-center -mt-1">Credits</span></div>
                                    <div className={`w-full py-1.5 rounded-lg text-xs font-bold text-white text-center bg-gradient-to-r ${pack.color} shadow-lg transition-all group-hover:shadow-indigo-500/40`}>₹{pack.price}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        <div>
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-[#1A1A1E]">Transaction History</h3></div>
            <div className={BillingStyles.historyContainer}>
                {isLoadingHistory ? (<div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full"></div></div>) : sortedGroupKeys.length > 0 ? (
                    <div className="relative">
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar px-2">
                            {sortedGroupKeys.map((date) => (
                                <div key={date} className="mb-6 last:mb-0">
                                    <h4 className={BillingStyles.historyDateGroup}>{date}</h4>
                                    <div className="space-y-1">
                                        {groupedTransactions[date].map((tx) => (
                                             <div key={tx.id} className={BillingStyles.historyItem}>
                                                <div className="flex items-center gap-4">
                                                    <div className="group-hover:scale-110 transition-transform duration-300">{getIconForFeature(tx.feature)}</div>
                                                    <div>
                                                         {tx.feature === 'MagicPixa Credit Grant' ? (<><p className="font-bold text-gray-800">{tx.reason}</p><p className="text-[10px] font-medium text-gray-400 mt-0.5">MagicPixa Grant</p></>) : (<><p className="font-bold text-gray-800">{tx.feature.replace('Admin Grant', 'MagicPixa Grant').replace('Magic Eraser', 'Magic Editor')}</p><p className="text-[10px] font-medium text-gray-400 mt-0.5">{(tx.date as any).toDate ? (tx.date as any).toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : new Date((tx.date as any).seconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p></>)}
                                                    </div>
                                                </div>
                                                 {tx.creditChange ? (<span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs border border-green-100">{tx.creditChange}</span>) : (<span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-md text-xs">-{tx.cost}</span>)}
                                             </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white pointer-events-none"></div>
                    </div>
                ) : (
                    <div className="text-center py-16"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3"><TicketIcon className="w-8 h-8 text-gray-300" /></div><p className="text-gray-400 text-sm">No transactions yet.</p></div>
                )}
            </div>
        </div>
      </div>
      {successCredits !== null && <PaymentSuccessModal creditsAdded={successCredits} packName={successPackName} onClose={() => { setSuccessCredits(null); setActiveView('home_dashboard'); }} />}
    </>
  );
};