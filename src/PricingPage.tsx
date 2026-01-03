
import React, { useState } from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
    CheckIcon, SparklesIcon, ChevronDownIcon, 
    PlusIcon, ShieldCheckIcon, CreditCoinIcon, 
    LightningIcon, GiftIcon, StarIcon,
    InformationCircleIcon, ArrowRightIcon
} from './components/icons';
import { ProfessionalHomeStyles as styles } from './styles/ProfessionalHome.styles';

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
        <div className="border-b border-gray-100 last:border-0 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-6 text-left group transition-all"
            >
                <span className={`text-lg font-black tracking-tight transition-colors ${isOpen ? 'text-indigo-600' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                    {item.question}
                </span>
                <div className={`p-2 rounded-full transition-all shrink-0 ${isOpen ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                    <ChevronDownIcon className="w-5 h-5" />
                </div>
            </button>
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'max-h-96 pb-8 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                <p className="text-slate-500 leading-relaxed font-medium max-w-2xl">
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
        <div className={styles.main}>
            <Header navigateTo={navigateTo} auth={auth} />
            
            {/* BACKGROUND DECORATION */}
            <div className={styles.meshGradient}></div>
            <div className={styles.grainTexture}></div>

            <main className="relative z-10">
                {/* HERO */}
                <section className="pt-32 pb-24 px-4 text-center">
                    <div className="max-w-4xl mx-auto animate-fadeInUp">
                        <div className={styles.heroBadge}>
                            <LightningIcon className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Simple, Direct, Credits for Life</span>
                        </div>
                        <h1 className={styles.heroTitle}>
                            Pay only for <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">what you create.</span>
                        </h1>
                        <p className={styles.heroSubtitle}>
                            No monthly subscriptions. No hidden fees. Just professional-grade AI tools fueled by credits that never expire.
                        </p>
                    </div>
                </section>

                {/* PRICING GRID */}
                <section className="pb-32 px-4">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                            group relative bg-white p-10 rounded-[2.5rem] border border-gray-100 transition-all duration-500 flex flex-col h-full
                                            ${isCurrent 
                                                ? 'ring-4 ring-indigo-500/10 border-indigo-200 shadow-2xl scale-[1.05] z-10' 
                                                : 'hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-2'
                                            }
                                            ${!isUpgrade && !isCurrent && auth.isAuthenticated ? 'opacity-60 bg-gray-50/30' : ''}
                                        `}
                                    >
                                        {isCurrent && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg border-4 border-white">
                                                Active
                                            </div>
                                        )}

                                        {pack.popular && !isCurrent && !isDowngrade && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#F9D230] text-[#1A1A1E] text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-md">
                                                Best Value
                                            </div>
                                        )}

                                        <div className="mb-10">
                                            <h3 className="text-2xl font-black text-slate-950 tracking-tight mb-2">{pack.name}</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed min-h-[40px]">{pack.tagline}</p>
                                        </div>

                                        <div className="mb-10">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-6xl font-black text-slate-950 tracking-tighter">{pack.totalCredits}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credits</span>
                                            </div>
                                            {pack.bonus > 0 && (
                                                <div className="mt-3 flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-4 py-1.5 rounded-full border border-emerald-100">
                                                    <SparklesIcon className="w-3 h-3" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Bonus +{pack.bonus}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto space-y-8">
                                            <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-center transition-colors group-hover:bg-indigo-50/50 group-hover:border-indigo-100">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2">One-Time Production Fee</p>
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="text-sm font-black text-slate-900 mt-1">₹</span>
                                                    <span className="text-4xl font-black text-slate-950 tracking-tight">{pack.price}</span>
                                                </div>
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
                                                    w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2
                                                    ${auth.isAuthenticated 
                                                        ? (isCurrent 
                                                            ? 'bg-indigo-600 text-white shadow-none'
                                                            : (isUpgrade 
                                                                ? 'bg-slate-950 text-white hover:bg-black hover:scale-[1.02] shadow-xl'
                                                                : 'bg-slate-100 text-slate-400 cursor-default shadow-none'))
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] shadow-xl shadow-indigo-500/20'
                                                    }
                                                `}
                                            >
                                                {auth.isAuthenticated 
                                                    ? (isCurrent ? <><CheckIcon className="w-4 h-4"/> Active</> : isDowngrade ? "In Catalog" : "Upgrade")
                                                    : "Begin Creation"
                                                }
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* TRUST BAR */}
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-white/40 backdrop-blur-md rounded-[3rem] border border-white shadow-sm">
                            <div className="flex items-center gap-8 px-4">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 shrink-0">
                                    <ShieldCheckIcon className="w-8 h-8 text-indigo-600"/>
                                </div>
                                <div className="text-left">
                                    <h4 className="text-lg font-black text-slate-950 tracking-tight leading-none mb-2">Secure Production</h4>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">Encrypted via Razorpay. All major cards, UPI, and wallets supported.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8 px-4 md:border-l border-slate-100">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 shrink-0">
                                    <StarIcon className="w-8 h-8 text-amber-500"/>
                                </div>
                                <div className="text-left">
                                    <h4 className="text-lg font-black text-slate-950 tracking-tight leading-none mb-2">Immutable Credits</h4>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">Purchased credits never expire. Use them for your next campaign next week, or next year.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ SECTION */}
                <section className="py-40 px-4 bg-white/50 relative overflow-hidden">
                    <div className="max-w-4xl mx-auto relative z-10">
                        <div className="text-center mb-20">
                            <div className="inline-flex items-center justify-center p-3.5 bg-indigo-50 rounded-2xl text-indigo-600 mb-6 shadow-inner">
                                <InformationCircleIcon className="w-7 h-7" />
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tighter mb-4">Operations & FAQ</h2>
                            <p className="text-slate-500 font-medium text-lg">Everything you need to know about the MagicPixa production cycle.</p>
                        </div>
                        
                        <div className="bg-white/60 backdrop-blur-xl p-8 md:p-16 rounded-[3rem] border border-white shadow-xl">
                            <div className="divide-y divide-slate-100">
                                {FAQ_ITEMS.map((item, i) => (
                                    <FAQItem key={i} item={item} />
                                ))}
                            </div>
                        </div>

                        <div className="mt-16 text-center">
                            <button 
                                onClick={() => navigateTo('dashboard', 'support_center')}
                                className="group inline-flex items-center gap-3 text-indigo-600 font-black uppercase tracking-[0.25em] text-[10px] hover:text-indigo-800 transition-all border-b-2 border-indigo-100 pb-2"
                            >
                                Contact Agency Support
                                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* FINAL CTA */}
                <section className="py-48 px-4 text-center relative overflow-hidden bg-white">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                    <div className="max-w-3xl mx-auto relative z-10">
                        <h2 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter mb-12 leading-[1.1]">Ready to engineer your next campaign?</h2>
                        <button 
                            onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                            className={styles.primaryButton + " mx-auto scale-110"}
                        >
                            Start Creating Now
                            <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            <div className={styles.buttonGlow}></div>
                        </button>
                    </div>
                </section>
            </main>

            <Footer navigateTo={navigateTo} />
        </div>
    );
};

export default PricingPage;
