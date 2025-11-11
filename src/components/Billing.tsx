import React, { useState, useEffect } from 'react';
import { User, Transaction } from '../types';
import { addCredits, getCreditHistory } from '../firebase';
import { SparklesIcon, CheckIcon, InformationCircleIcon, TicketIcon, PlusCircleIcon, ChevronRightIcon, XIcon } from './icons';

interface BillingProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const creditPackages = [
  { credits: 100, price: 4.99, bestValue: false, description: "Perfect for casual users" },
  { credits: 250, price: 9.99, bestValue: true, description: "Most popular choice for creators" },
  { credits: 600, price: 19.99, bestValue: false, description: "For heavy users and small teams" },
];

const Billing: React.FC<BillingProps> = ({ user, setUser }) => {
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);
  const [purchasedPackage, setPurchasedPackage] = useState<number | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (user) {
        getCreditHistory(user.uid)
            .then(setTransactions)
            .catch(console.error);
    }
  }, [user]);

  const earnOpportunities = [
    { title: 'Invite a Friend', credits: 5, action: 'Invite' },
    { title: 'Follow us on Social Media', credits: 2, action: 'Follow' },
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

  const handlePurchase = async (credits: number, index: number) => {
    setLoadingPackage(index);
    try {
      const updatedProfile = await addCredits(user.uid, credits);
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
          <p className="text-[#5F6368] mt-1">Manage your credits and purchase new packages.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 mb-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-[#1E1E1E]">Your Credit Balance</h3>
                <button onClick={() => setIsInfoModalOpen(true)} className="text-gray-400 hover:text-[#0079F2]">
                    <InformationCircleIcon className="w-6 h-6"/>
                </button>
            </div>
            <div className="flex items-end gap-4">
                <div className="relative w-24 h-24">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
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
                    <div className="absolute inset-0 flex items-center justify-center">
                        <SparklesIcon className="w-8 h-8 text-[#f9d230]"/>
                    </div>
                </div>
                <div>
                     <p className="text-5xl font-bold text-[#1E1E1E] leading-none">{user.credits}</p>
                     <p className="text-[#5F6368] text-lg">Credits</p>
                </div>
            </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold text-[#1E1E1E] mb-4">Top Up Your Credits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creditPackages.map((pkg, index) => (
              <div key={index} className={`relative bg-white p-6 rounded-xl border-2 transition-transform transform hover:-translate-y-1 ${pkg.bestValue ? 'border-[#0079F2] shadow-lg shadow-blue-500/10' : 'border-gray-200/80'}`}>
                {pkg.bestValue && (
                  <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-[#0079F2] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2 text-[#1E1E1E]"><SparklesIcon className="w-5 h-5 text-yellow-400"/> {pkg.credits} Credits</h3>
                  <p className="text-4xl font-bold mb-2 text-[#1E1E1E]">${pkg.price}</p>
                  <p className="text-[#5F6368] text-sm h-10 mb-4">{pkg.description}</p>
                  <button
                    onClick={() => handlePurchase(pkg.credits, index)}
                    disabled={loadingPackage !== null}
                    className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-wait ${
                      purchasedPackage === index
                        ? 'bg-green-500 text-white'
                        : pkg.bestValue
                        ? 'bg-[#0079F2] text-white hover:bg-blue-700'
                        : 'bg-gray-100 hover:bg-gray-200 text-[#1E1E1E]'
                    }`}
                  >
                    {loadingPackage === index ? (
                      <svg className="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : purchasedPackage === index ? (
                      <span className="flex items-center justify-center gap-2"><CheckIcon className="w-5 h-5"/> Purchased!</span>
                    ) : (
                      'Purchase'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <h3 className="text-xl font-bold text-[#1E1E1E] mb-4">Credit Usage History</h3>
                <div className="bg-white p-4 rounded-xl border border-gray-200/80 space-y-3">
                    {transactions.length > 0 ? transactions.map((tx) => (
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

            <div>
                <h3 className="text-xl font-bold text-[#1E1E1E] mb-4">Earn Free Credits</h3>
                 <div className="bg-white p-4 rounded-xl border border-gray-200/80 space-y-3">
                     {earnOpportunities.map((op, index) => (
                        <div key={index} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-50">
                           <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-full">
                                    <PlusCircleIcon className="w-5 h-5 text-green-600"/>
                                </div>
                               <div>
                                    <p className="font-semibold text-[#1E1E1E]">{op.title}</p>
                                    <p className="text-xs text-green-600 font-bold">Earn +{op.credits} Credits</p>
                               </div>
                           </div>
                           <button className="text-xs font-bold text-white bg-[#0079F2] rounded-full px-4 py-1.5">{op.action}</button>
                        </div>
                     ))}
                 </div>
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