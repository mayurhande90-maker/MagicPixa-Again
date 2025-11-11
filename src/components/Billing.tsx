import React, { useState, useEffect } from 'react';
import { User, Transaction } from '../types';
import { addCredits, getCreditHistory } from '../firebase';
import { SparklesIcon, CheckIcon, InformationCircleIcon, TicketIcon, XIcon } from './icons';

interface BillingProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const pricingPlans: {
  yearly: any[];
  monthly: any[];
} = {
    yearly: [
        { name: 'Pro', price: '299', credits: '100 / month', popular: false, features: ['100 Credits/month', 'High Resolution', 'AI Photo Studio', 'Background Remover', 'Image Upscaler (2x)', 'Email Support'] },
        { name: 'Pro Plus', price: '499', credits: '500 / month', popular: true, features: ['500 Credits/month', 'High Resolution', 'Full Feature Access', 'Image Upscaler (4x)', 'Priority Support'] },
        { name: 'VIP', price: '999', credits: '1000 / month', popular: false, features: ['1000 Credits/month', '4K Resolution', 'Full Feature Access', 'Image Upscaler (8x)', 'Dedicated Support'] }
    ],
    monthly: [
        { name: 'Pro', price: '359', credits: '100 / month', popular: false, features: ['100 Credits/month', 'High Resolution', 'AI Photo Studio', 'Background Remover', 'Image Upscaler (2x)', 'Email Support'] },
        { name: 'Pro Plus', price: '599', credits: '500 / month', popular: true, features: ['500 Credits/month', 'High Resolution', 'Full Feature Access', 'Image Upscaler (4x)', 'Priority Support'] },
        { name: 'VIP', price: '1199', credits: '1000 / month', popular: false, features: ['1000 Credits/month', '4K Resolution', 'Full Feature Access', 'Image Upscaler (8x)', 'Dedicated Support'] }
    ]
};

const creditCosts = [
    { feature: 'Photo Studio', cost: '2 Credits' },
    { feature: 'Magic Soul', cost: '3 Credits' },
    { feature: 'Photo Colour', cost: '2 Credits' },
    { feature: 'CaptionAI', cost: '1 Credit' },
    { feature: 'Interior AI', cost: '2 Credits' },
    { feature: 'Apparel AI', cost: '3 Credits' },
    { feature: 'Mockup AI', cost: '2 Credits' },
];

const Billing: React.FC<BillingProps> = ({ user, setUser }) => {
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);
  const [purchasedPackage, setPurchasedPackage] = useState<number | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isYearly, setIsYearly] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

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
    const creditsToAdd = parseInt(pkg.credits, 10);
    if (isNaN(creditsToAdd)) {
        console.error("Invalid credit amount in package:", pkg.credits);
        return;
    }

    setLoadingPackage(index);
    try {
      const updatedProfile = await addCredits(user.uid, creditsToAdd);
      setUser(prev => prev ? { ...prev, credits: updatedProfile.credits, plan: updatedProfile.plan } : null);
      setPurchasedPackage(index);
      setTimeout(() => setPurchasedPackage(null), 3000);
    } catch (error) {
      console.error("Failed to add credits:", error);
      alert("There was an issue processing your purchase. Please try again.");
    } finally {
      setLoadingPackage(null);
    }
  };
  
  const maxCreditsForMeter = user.plan === 'Free' ? 10 : 100;
  const creditPercentage = Math.min((user.credits / maxCreditsForMeter) * 100, 100);

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
        <div className='mb-8'>
          <h2 className="text-3xl font-bold text-[#1E1E1E]">Billing & Credits</h2>
          <p className="text-[#5F6368] mt-1">Manage your plan and review your credit usage.</p>
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
                     <p className="text-[#5F6368] text-lg">{user.plan} Plan</p>
                </div>
            </div>
        </div>

        <div className="mb-8">
            <div className="text-center">
                <h3 className="text-xl font-bold text-[#1E1E1E] mb-3">Choose Your Perfect Plan</h3>
                <p className="text-lg text-[#5F6368] mb-8">Simple, transparent pricing for everyone.</p>
                <div className="flex justify-center items-center gap-4 mb-12">
                    <span className={`font-semibold ${!isYearly ? 'text-[#0079F2]' : 'text-[#5F6368]'}`}>Monthly</span>
                    <label htmlFor="billing-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="billing-toggle" className="sr-only peer" checked={isYearly} onChange={() => setIsYearly(!isYearly)} />
                        <div className="w-14 h-8 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#0079F2]"></div>
                    </label>
                    <span className={`font-semibold ${isYearly ? 'text-[#0079F2]' : 'text-[#5F6368]'}`}>
                        Yearly <span className="text-sm font-normal bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">Save 20%</span>
                    </span>
                </div>
            </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {(isYearly ? pricingPlans.yearly : pricingPlans.monthly).map((plan, index) => (
              <div key={index} className={`relative bg-white p-4 md:p-6 rounded-2xl shadow-sm border-2 text-left flex flex-col transition-transform transform hover:-translate-y-1 ${plan.popular ? 'border-[#0079F2] shadow-lg shadow-blue-500/10' : 'border-gray-200/80'}`}>
                {plan.popular && <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-[#0079F2] text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Most Popular</div>}
                <h3 className="text-lg md:text-xl font-bold text-[#1E1E1E] mb-1 md:mb-2 text-center">{plan.name}</h3>
                <p className="text-sm md:text-base text-[#5F6368] mb-2 md:mb-4 text-center">{plan.credits}</p>
                <p className="mb-4 md:mb-6 text-center">
                    <span className="text-3xl md:text-4xl font-bold text-[#1E1E1E]">₹{plan.price}</span>
                    <span className="text-sm md:text-base text-[#5F6368]">/ month</span>
                </p>
                <ul className="space-y-2 md:space-y-3 text-sm text-[#5F6368] flex-grow mb-6">
                    {plan.features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-center gap-3">
                            <CheckIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
                <button
                    onClick={() => handlePurchase(plan, index)}
                    disabled={loadingPackage !== null}
                    className={`w-full font-semibold py-2.5 md:py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-wait ${
                    purchasedPackage === index
                        ? 'bg-green-500 text-white'
                        : plan.popular
                        ? 'bg-[#0079F2] text-white hover:bg-blue-700'
                        : 'bg-gray-100 hover:bg-gray-200 text-[#1E1E1E]'
                    }`}
                >
                    {loadingPackage === index ? (
                      <svg className="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : purchasedPackage === index ? (
                      <span className="flex items-center justify-center gap-2"><CheckIcon className="w-5 h-5"/> Purchased!</span>
                    ) : (
                      'Choose Plan'
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
                        <span className="font-bold text-red-500">-{tx.cost}</span>
                    </div>
                )) : (
                    <p className="text-sm text-gray-500 text-center py-4">No recent transactions.</p>
                )}
            </div>
        </div>
      </div>
      
      {isInfoModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
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
    </>
  );
};

export default Billing;