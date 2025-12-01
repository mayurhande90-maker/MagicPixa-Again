import React, { useState, useEffect } from 'react';
import { User, AppConfig, View } from '../types';
import { purchaseTopUp } from '../firebase';
import { XIcon, CreditCardIcon, SparklesIcon, CheckIcon, InformationCircleIcon, TicketIcon, StarIcon } from './icons';

interface BillingProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  appConfig: AppConfig | null;
  setActiveView: (view: View) => void;
}

export const Billing: React.FC<BillingProps> = ({ user, setUser, appConfig, setActiveView }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const creditCosts = appConfig?.featureCosts 
    ? Object.entries(appConfig.featureCosts).map(([feature, cost]) => ({ feature, cost })) 
    : [];

  const handlePurchase = async (packIndex: number) => {
    if (!appConfig) return;
    const pack = appConfig.creditPacks[packIndex];
    if (!pack) return;

    setIsProcessing(true);

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: pack.price * 100, 
      currency: "INR",
      name: "MagicPixa",
      description: `Purchase ${pack.totalCredits} Credits`,
      image: "https://magicpixa.com/logo.png",
      handler: async function (response: any) {
        try {
            const updatedUser = await purchaseTopUp(user.uid, pack.name, pack.totalCredits, pack.price);
            setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            alert(`Payment Successful! Added ${pack.totalCredits} credits.`);
        } catch (error: any) {
            console.error("Purchase error", error);
            alert("Failed to update credits. Please contact support.");
        } finally {
            setIsProcessing(false);
        }
      },
      prefill: {
        name: user.name,
        email: user.email,
        contact: "" 
      },
      theme: {
        color: "#4F46E5"
      },
      modal: {
          ondismiss: function() {
              setIsProcessing(false);
          }
      }
    };

    if (typeof window.Razorpay !== 'undefined') {
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response: any){
                alert("Payment Failed: " + response.error.description);
                setIsProcessing(false);
        });
        rzp1.open();
    } else {
        alert("Payment gateway not loaded. Please refresh.");
        setIsProcessing(false);
    }
  };

  useEffect(() => {
      if (!document.getElementById('razorpay-script')) {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.id = 'razorpay-script';
          document.body.appendChild(script);
      }
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto pb-32 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-[#1A1A1E]">Billing & Credits</h1>
                <p className="text-gray-500 mt-1">Manage your balance and top up.</p>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Balance</p>
                    <p className="text-2xl font-black text-[#1A1A1E]">{user.credits}</p>
                </div>
                <div className="p-3 bg-[#F9D230]/20 text-[#1A1A1E] rounded-xl">
                    <SparklesIcon className="w-6 h-6"/>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {appConfig?.creditPacks.map((pack, index) => (
                <div key={index} className={`relative bg-white p-6 rounded-3xl border-2 transition-all duration-300 hover:shadow-xl flex flex-col ${pack.popular ? 'border-[#F9D230] shadow-md scale-105 z-10' : 'border-gray-100 hover:border-gray-300'}`}>
                    {pack.popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#F9D230] text-[#1A1A1E] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                            <StarIcon className="w-3 h-3"/> Best Value
                        </div>
                    )}
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{pack.name}</h3>
                    <p className="text-xs text-gray-500 mb-6 min-h-[32px]">{pack.tagline}</p>
                    
                    <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-gray-900">{pack.totalCredits}</span>
                            <span className="text-sm font-bold text-gray-500">credits</span>
                        </div>
                        {pack.bonus > 0 && (
                            <p className="text-xs font-bold text-green-600 mt-1 flex items-center gap-1">
                                <CheckIcon className="w-3 h-3"/> Includes {pack.bonus} bonus
                            </p>
                        )}
                    </div>
                    
                    <div className="mt-auto">
                        <div className="flex justify-between items-center mb-4 text-sm">
                            <span className="font-bold text-gray-400">Price</span>
                            <span className="font-bold text-gray-900 text-lg">₹{pack.price}</span>
                        </div>
                        <button 
                            onClick={() => handlePurchase(index)}
                            disabled={isProcessing}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                                pack.popular 
                                ? 'bg-[#1A1A1E] text-white hover:bg-black hover:scale-105' 
                                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                            }`}
                        >
                            {isProcessing ? 'Processing...' : 'Purchase'}
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <TicketIcon className="w-5 h-5 text-gray-400"/> Consumption Rates
                </h3>
                <button 
                    onClick={() => setIsInfoModalOpen(true)}
                    className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                    <InformationCircleIcon className="w-4 h-4"/> View Details
                </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {creditCosts.slice(0, 8).map(item => (
                    <div key={item.feature} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <span className="text-xs font-bold text-gray-500 truncate mr-2">{item.feature}</span>
                        <span className="text-sm font-black text-gray-900">{item.cost}</span>
                    </div>
                ))}
            </div>
        </div>

      {isInfoModalOpen && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setIsInfoModalOpen(false)}
          >
              <div 
                className="relative bg-white w-full max-w-2xl m-4 p-8 rounded-3xl shadow-2xl border border-gray-100 animate-bounce-slight"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                      {creditCosts.map(item => (
                          <div key={item.feature} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl text-sm border border-gray-100 hover:bg-gray-100 transition-colors">
                              <span className="text-gray-600 font-medium truncate mr-2">{item.feature}</span>
                              <span className="font-bold text-[#1A1A1E] bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-sm whitespace-nowrap">{item.cost}</span>
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
    </div>
  );
};