
import React, { useState } from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
// Added InformationCircleIcon and ArrowRightIcon to imports
import { 
    CheckIcon, SparklesIcon, ChevronDownIcon, 
    PlusIcon, ShieldCheckIcon, CreditCoinIcon, 
    LightningIcon, GiftIcon, StarIcon,
    InformationCircleIcon, ArrowRightIcon
} from './components/icons';
import { HomeStyles } from './styles/Home.styles';

interface PricingPageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  appConfig: AppConfig | null;
}

const PLAN_WEIGHTS: Record<string, number> = {
    'Free': 0,
    'Starter Pack': 1,
    'Creator Pack': 2,
    'Studio Pack': 3,
    'Agency Pack': 4
};

const FAQ_ITEMS = [
    {
        question: "How do MagicPixa credits work?",
        answer: "MagicPixa uses a pay-as-you-go credit system. Each feature (Product Shots, AdMaker, etc.) costs a specific amount of credits to run. You buy a credit pack once, and use them whenever you need. There are no monthly recurring fees unless you choose to buy more."
    },
    {
        question: "Do my credits ever expire?",
        answer: "No. Any credits you purchase will stay in your account forever until you use them. We believe in providing value without the pressure of expiration dates."
    },
    {
        question: "What is your refund policy for AI images?",
        answer: "We strive for excellence, but AI can sometimes be unpredictable. We have an automated 'Report Issue' system. If a generation doesn't meet quality standards, you can report it within the app for an instant automated credit refund (eligible once every 24 hours)."
    },
    {
        question: "Is there a recurring monthly subscription?",
        answer: "No. All our credit packs are one-time purchases. You only pay for what you need, when you need it. This gives you total control over your creative budget."
    },
    {
        question: "Can I use the generated images for my business?",
        answer: "Absolutely. All images generated through any paid credit pack come with full commercial usage rights. You can use them for ads, social media, websites, or print materials for your own business or your clients."
    },
    {
        question: "What if I need more than the Agency Pack offers?",
        answer: "If you are a high-volume agency or enterprise needing thousands of credits monthly, please contact our support team. We can create custom high-volume solutions tailored to your production pipeline."
    }
];

const FAQItem: React.FC<{ item: typeof FAQ_ITEMS[0] }> = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-6 text-left group transition-all"
            >
                <span className={`text-lg font-bold transition-colors ${isOpen ? 'text-indigo-600' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                    {item.question}
                </span>
                <div className={`p-2 rounded-full transition-all ${isOpen ? 'bg-indigo-600 text-white rotate-180' : 'bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                    <ChevronDownIcon className="w-5 h-5" />
                </div>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-slate-500 leading-relaxed font-medium">
                    {item.answer}
                </p>
            </div>
        </div>
    );
};

const PricingPage: React.FC<PricingPageProps> = ({ navigateTo, auth, appConfig }) => {
    const creditPacks = appConfig?.creditPacks || [];
    const currentPlanWeight = PLAN_WEIGHTS[auth.user?.plan || 'Free'] || 0;

    return (
        <div className="min-h-screen bg-[#FAFAFB] flex flex-col font-sans">
            <Header navigateTo={navigateTo} auth={auth} />
            
            <main className="flex-grow">
                {/* HERO */}
                <section className="pt-24 pb-20 px-4 text-center">
                    <div className="max-w-4xl mx-auto animate-fadeInUp">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full mb-8">
                            <LightningIcon className="w-4 h-4 text-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Simple & Transparent</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tighter mb-6 leading-none">
                            Pay only for <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">what you create.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                            No monthly subscriptions. No hidden fees. Just professional-grade AI tools fueled by credits that never expire.
                        </p>
                    </div>
                </section>

                {/* PRICING GRID */}
                <section className="pb-32 px-4">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {creditPacks.map((pack, index) => {
                                const packWeight = PLAN_WEIGHTS[pack.name] || 0;
                                
                                let isUpgrade = true;
                                let isCurrent = false;
                                let isDowngrade = false;

                                if (auth.isAuthenticated && auth.user) {
                                    isUpgrade = packWeight > currentPlanWeight;
                                    isCurrent = packWeight === currentPlanWeight;
                                    isDowngrade = packWeight < currentPlanWeight;
                                }

                                return (
                                    <div 
                                        key={index} 
                                        className={`
                                            group relative bg-white p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col h-full
                                            ${isCurrent 
                                                ? 'border-indigo-600 shadow-2xl shadow-indigo-500/10 scale-[1.05] z-10 ring-4 ring-indigo-50' 
                                                : (pack.popular && !isDowngrade ? 'border-[#F9D230] shadow-xl hover:shadow-2xl hover:-translate-y-2' : 'border-gray-100 hover:border-indigo-200 hover:shadow-xl hover:-translate-y-2')
                                            }
                                            ${!isUpgrade && !isCurrent && auth.isAuthenticated ? 'opacity-70 bg-gray-50/50' : ''}
                                        `}
                                    >
                                        {isCurrent && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg border-4 border-white">
                                                Active Plan
                                            </div>
                                        )}

                                        {pack.popular && !isCurrent && !isDowngrade && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#F9D230] text-[#1A1A1E] text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                                                Best Value
                                            </div>
                                        )}

                                        <div className="mb-8">
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">{pack.name}</h3>
                                            <p className="text-xs font-medium text-slate-400 leading-relaxed min-h-[40px]">{pack.tagline}</p>
                                        </div>

                                        <div className="mb-8">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-5xl font-black text-slate-900 tracking-tighter">{pack.totalCredits}</span>
                                                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Credits</span>
                                            </div>
                                            {pack.bonus > 0 && (
                                                <div className="mt-2 flex items-center gap-1.5 text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100 animate-pulse">
                                                    <SparklesIcon className="w-3 h-3" />
                                                    <span className="text-[10px] font-black uppercase">Includes {pack.bonus} Bonus</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto space-y-6">
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center group-hover:bg-indigo-50/30 group-hover:border-indigo-100 transition-colors">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">One-Time Fee</p>
                                                <span className="text-3xl font-black text-slate-900">₹{pack.price}</span>
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    if (!auth.isAuthenticated) {
                                                        auth.openAuthModal();
                                                    } else if (isUpgrade) {
                                                        navigateTo('dashboard', 'billing');
                                                    }
                                                }}
                                                disabled={auth.isAuthenticated && !isUpgrade}
                                                className={`
                                                    w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2
                                                    ${auth.isAuthenticated 
                                                        ? (isCurrent 
                                                            ? 'bg-indigo-600 text-white cursor-default shadow-none'
                                                            : (isUpgrade 
                                                                ? 'bg-[#1A1A1E] text-white hover:bg-black hover:scale-[1.02]'
                                                                : 'bg-gray-100 text-gray-400 cursor-default shadow-none'))
                                                        : 'bg-[#F9D230] text-[#1A1A1E] hover:bg-[#dfbc2b] hover:scale-[1.02] shadow-yellow-500/20'
                                                    }
                                                `}
                                            >
                                                {auth.isAuthenticated 
                                                    ? (isCurrent ? <><CheckIcon className="w-4 h-4"/> Current</> : isDowngrade ? "Included" : "Get Pack")
                                                    : "Purchase Now"
                                                }
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-12 p-10 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm text-left">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                                    <ShieldCheckIcon className="w-8 h-8"/>
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-slate-900 leading-tight">Secure Payments</h4>
                                    <p className="text-sm text-slate-500 font-medium">Encrypted via Razorpay. All major cards, UPI, and wallets supported.</p>
                                </div>
                            </div>
                            <div className="w-px h-12 bg-gray-100 hidden md:block"></div>
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                                    <StarIcon className="w-8 h-8"/>
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-slate-900 leading-tight">No Expiry</h4>
                                    <p className="text-sm text-slate-500 font-medium">Credits stay in your account forever. No rush, no monthly stress.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ SECTION */}
                <section className="py-32 px-4 bg-white">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-2xl text-indigo-600 mb-4">
                                <InformationCircleIcon className="w-8 h-8" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-950 tracking-tighter mb-4">Frequently Asked Questions</h2>
                            <p className="text-slate-500 font-medium">Everything you need to know about MagicPixa billing and credits.</p>
                        </div>
                        
                        <div className="bg-[#F8FAFC] p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-inner">
                            <div className="divide-y divide-slate-200/60">
                                {FAQ_ITEMS.map((item, i) => (
                                    <FAQItem key={i} item={item} />
                                ))}
                            </div>
                        </div>

                        <div className="mt-16 text-center">
                            <p className="text-slate-400 font-bold text-sm mb-6">Still have questions?</p>
                            <button 
                                onClick={() => navigateTo('dashboard', 'support_center')}
                                className="inline-flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-xs hover:text-indigo-800 transition-all border-b-2 border-indigo-100 pb-1"
                            >
                                Contact our Support Concierge
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-32 px-4 text-center relative overflow-hidden bg-[#FAFAFB]">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="max-w-2xl mx-auto relative z-10">
                        <h2 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter mb-8 leading-[1.1]">Ready to start your next campaign?</h2>
                        <button 
                            onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                            className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/20 flex items-center justify-center mx-auto group"
                        >
                            Start Creating Now
                            <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </section>
            </main>

            <Footer navigateTo={navigateTo} />
        </div>
    );
};

export default PricingPage;
