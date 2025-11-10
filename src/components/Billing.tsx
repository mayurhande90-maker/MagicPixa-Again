import React, { useState } from 'react';
import { User } from '../types';
import { addCredits } from '../firebase';
import { SparklesIcon, CheckIcon } from './icons';

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

  const handlePurchase = async (credits: number, index: number) => {
    setLoadingPackage(index);
    try {
      const updatedProfile = await addCredits(user.uid, credits);
      setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
      setPurchasedPackage(index);
      setTimeout(() => setPurchasedPackage(null), 3000); // Reset after 3 seconds
    } catch (error) {
      console.error("Failed to add credits:", error);
      alert("There was an issue processing your purchase. Please try again.");
    } finally {
      setLoadingPackage(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      <div className='mb-8'>
        <h2 className="text-3xl font-bold text-[#1E1E1E]">Get More Credits</h2>
        <p className="text-[#5F6368] mt-1">
          Your current balance is <span className="font-bold text-[#1E1E1E]">{user.credits}</span> credits.
          Choose a package below to top up your account and continue creating.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {creditPackages.map((pkg, index) => (
          <div key={index} className={`relative bg-white p-8 rounded-xl border-2 transition-colors ${pkg.bestValue ? 'border-[#0079F2]' : 'border-gray-200/80'}`}>
            {pkg.bestValue && (
              <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-[#0079F2] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Best Value
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2 text-[#1E1E1E]"><SparklesIcon className="w-5 h-5 text-[#0079F2]"/> {pkg.credits} Credits</h3>
              <p className="text-4xl font-bold mb-2 text-[#1E1E1E]">${pkg.price}</p>
              <p className="text-[#5F6368] h-10 mb-6">{pkg.description}</p>
              <button
                onClick={() => handlePurchase(pkg.credits, index)}
                disabled={loadingPackage !== null}
                className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform disabled:opacity-50 disabled:cursor-wait ${
                  purchasedPackage === index
                    ? 'bg-green-500 text-white'
                    : pkg.bestValue
                    ? 'bg-[#0079F2] text-white hover:bg-blue-700 hover:scale-105'
                    : 'bg-gray-100 hover:bg-gray-200 text-[#1E1E1E] hover:scale-105'
                }`}
              >
                {loadingPackage === index ? (
                  <svg className="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : purchasedPackage === index ? (
                  <span className="flex items-center justify-center gap-2"><CheckIcon className="w-5 h-5"/> Credits Added!</span>
                ) : (
                  'Buy Now'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Billing;
// Minor change for commit.