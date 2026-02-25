import React, { useState } from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
    CheckIcon, SparklesIcon, ChevronDownIcon, 
    ShieldCheckIcon, CreditCoinIcon, 
    LightningIcon, StarIcon,
    InformationCircleIcon, ArrowRightIcon
} from './components/icons';
import { HomeStyles } from './styles/Home.styles';
import { triggerCheckout } from './services/paymentService';
import { PaymentSuccessModal } from './components/PaymentSuccessModal';

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

const PLAN_BENEFITS: Record<string, string[]> = {
    'Starter Pack': [
        '50 AI Credits (Try every tool)',
        '1 Brand Kit Slot',
        'Standard Definition (HD) Output',
        'Standard Support (AI Bot)',
        'Personal Usage License'
    ],
    'Creator Pack': [
        '165 AI Credits (Better Value)',
        '3 Brand Kit Slots',
        'High-Resolution (4K) Output',
        'Full Commercial Usage Rights',
        'Verified Identity Lock 6.0'
    ],
    'Studio Pack': [
        '300 AI Credits (Bulk Savings)',
        '10 Brand Kit Slots',
        'Ultra-Resolution (8K) Output',
        'Priority Processing (2x Faster)',
        'Priority Support (Human Agent)'
    ],
    'Agency Pack': [
        '1200 AI Credits (Best Rate)',
        '50 Brand Kit Slots',
        'Unlimited 8K High-Res Exports',
        'Dedicated Account Manager',
        'White-Label Content (No Metadata)'
    ]
};

const FAQ_ITEMS = [
    {
        question: "How do MagicPixa credits work?",
        answer: "MagicPixa uses a pay-as-you-go credit system. Each feature costs a specific amount of credits to run. You buy a credit pack once, and use them whenever you need. There are no monthly recurring fees."
    },
    {
        question: "Do my credits ever expire?",
        answer: "No. Any credits you purchase will stay in your account forever until you use them. We believe in providing value without the pressure of expiration dates."
    },
    {
        question: "What is your refund policy?",
        answer: "If a generation doesn't meet quality standards, you can report it within the app for an instant automated credit refund, eligible once every 24 hours."
    },
    {
        question: "Is there a recurring subscription?",
        answer: "No. All our credit packs are one-time purchases. You only pay for what you need, when you need it. This gives you total control over your budget."
    },
    {
        question: "Can I use images for my business?",
        answer: "Absolutely. All images generated through any paid credit pack come with full commercial usage rights for ads, social media, and websites."
    },
    {
        question: "What if I need more credits?",
        answer: "If you are a high-volume agency needing thousands of credits, please contact our support team for custom high-volume enterprise solutions."
    }
];

const FAQItem: React.FC<{ item: typeof FAQ_ITEMS[0] }> = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-5 text-left group transition-all"
            >
                <span className={`text-base font-semibold transition-colors ${isOpen ? 'text-[#4D7CFF]' : 'text-[#1A1A1E] group-hover:text-[#4D7CFF]'}`}>
                    {item.question}
                </span>
                <div className={`transition-all ${isOpen ? 'rotate-180 text-[#4D7CFF]' : 'text-gray-400'}`}>
                    <ChevronDownIcon className="w-5 h-5" />
                </div>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-[#5F6368] text-sm leading-relaxed">
                    {item.answer}
                </p>
            </div>
        </div>
    );
};

const PricingPage: React.FC<PricingPageProps> = ({ navigateTo, auth, appConfig }) => {
    const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
    const [successCredits, setSuccessCredits] = useState<number | null>(null);
    const [successPackName, setSuccessPackName] = useState<string>('');

    const creditPacks = appConfig?.creditPacks || [];
    const currentPlanWeight = PLAN_WEIGHTS[auth.user?.plan || 'Free'] || 0;

    const handleCheckout = (pack: any) => {
        if (!auth.isAuthenticated) {
            auth.openAuthModal();
            return;
        }
        
        if (!auth.user) return;

        setLoadingPackId(pack.name);
        triggerCheckout({
            user: auth.user,
            pkg: pack,
            type: 'plan',
            onSuccess: (updatedUser, totalCredits, packName) => {
                setSuccessPackName(packName);
                setSuccessCredits(totalCredits);
                auth.setUser(updatedUser);
                setLoadingPackId(null);
            },
            onCancel: () => setLoadingPackId(null),
            onError: (err) => {
                alert(err);
                setLoadingPackId(null);
            }
        });
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Header navigateTo={navigateTo} auth={auth} />
            
            <main className="flex-grow">
                {/* HERO SECTION - Matching HomePage Hero Style */}
                <section className="bg-white pt-12 pb-6 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 border border-transparent px-3 py-1 rounded-full mb-6 shadow-sm">
                            <LightningIcon className="w-3.5 h-3.5 text-white" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Flexible Pricing</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1E] mb-4 leading-tight">
                            Choose Your <span className="text-[#4D7CFF]">Creative Fuel</span>
                        </h1>
                        <p className="text-lg text-[#5F6368] max-w-2xl mx-auto font-medium">
                            No monthly subscriptions. No hidden fees. Just professional-grade AI tools powered by credits that never expire.
                        </p>
                    </div>
                </section>

                {/* PRICING GRID */}
                <section className="py-10 px-6 bg-[#F6F7FA]">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mt-4">
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

                                const isLoading = loadingPackId === pack.name;
                                const benefitsList = PLAN_BENEFITS[pack.name] || [];

                                return (
                                    <div 
                                        key={index} 
                                        className={`
                                            w-full rounded-[2.2rem] border-2 transition-all duration-300 p-8 flex flex-col relative overflow-hidden
                                            ${isCurrent 
                                                ? 'bg-green-50/30 border-green-500 shadow-2xl ring-4 ring-green-500/10 scale-[1.02] z-10' 
                                                : (pack.popular && !isDowngrade ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-500/5' : 'bg-white border-gray-100 shadow-sm')
                                            } 
                                            ${!isUpgrade && !isCurrent && auth.isAuthenticated ? 'opacity-70 grayscale-[0.2]' : ''}
                                        `}
                                    >
                                        {/* ACTIVE PLAN BADGE */}
                                        {isCurrent && (
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg border-2 border-white">
                                                Active Plan
                                            </div>
                                        )}

                                        {/* POPULAR BADGE */}
                                        {pack.popular && !isCurrent && !isDowngrade && (
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg border-2 border-white">
                                                Best Value
                                            </div>
                                        )}
                                        
                                        {/* Header */}
                                        <div className="mb-6">
                                            <h3 className="text-xl font-black text-[#1A1A1E] mb-1 uppercase tracking-tight">{pack.name}</h3>
                                            <p className="text-[#5F6368] text-xs font-medium leading-relaxed h-8 line-clamp-2">{pack.tagline}</p>
                                        </div>

                                        {/* Credits Display */}
                                        <div className="mb-8 p-6 bg-gray-50/50 rounded-3xl border border-gray-100/50 shadow-inner">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-5xl font-black text-[#1A1A1E] tracking-tighter">{pack.totalCredits}</span>
                                                <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Credits</span>
                                            </div>
                                            {pack.bonus > 0 && (
                                                <div className="mt-2 inline-flex items-center gap-1.5 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                                                    <SparklesIcon className="w-3 h-3" />
                                                    <span>+{pack.bonus} Bonus Included</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Benefits Table - Always Open Style */}
                                        <div className="flex-1 mb-8 space-y-3">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Plan Features</p>
                                            {benefitsList.map((benefit, i) => (
                                                <div key={i} className="flex items-center gap-3 animate-fadeInUp" style={{ animationDelay: `${i * 100}ms` }}>
                                                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shrink-0 shadow-sm">
                                                        <CheckIcon className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-700">{benefit}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pricing Footer */}
                                        <div className="mt-auto space-y-4">
                                            <div className="flex items-center justify-center px-2 text-center">
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">One-Time Fee</p>
                                                    <p className="text-2xl font-black text-gray-900">₹{pack.price}</p>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    if (!auth.isAuthenticated) {
                                                        auth.openAuthModal();
                                                    } else if (isUpgrade) {
                                                        handleCheckout(pack);
                                                    }
                                                }}
                                                disabled={(auth.isAuthenticated && !isUpgrade) || isLoading}
                                                className={`
                                                    w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3
                                                    ${auth.isAuthenticated 
                                                        ? (isCurrent 
                                                            ? 'bg-green-600 text-white cursor-default'
                                                            : (isUpgrade 
                                                                ? 'bg-[#1A1A1E] text-white hover:bg-black shadow-indigo-500/10'
                                                                : 'bg-gray-100 text-gray-500 cursor-default grayscale'))
                                                        : 'bg-[#1A1A1E] text-white hover:bg-black'
                                                    }
                                                `}
                                            >
                                                {isLoading ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : auth.isAuthenticated 
                                                    ? (isCurrent ? <><CheckIcon className="w-4 h-4"/> Active</> : isDowngrade ? "Included" : <><LightningIcon className="w-4 h-4"/> Upgrade Now</>)
                                                    : <>Get Started</>
                                                }
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* TRUST BAR - Classic Design */}
                <section className="py-8 bg-white px-4 border-b border-gray-100">
                    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#4D7CFF] shrink-0 shadow-sm border border-blue-100">
                                <ShieldCheckIcon className="w-6 h-6"/>
                            </div>
                            <div>
                                <h4 className="font-bold text-[#1A1A1E]">Secure Checkout</h4>
                                <p className="text-xs text-[#5F6368] font-medium">Safe payments via Razorpay. UPI, Cards & Wallets.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-[#1A1A1E] shrink-0 shadow-sm border border-gray-100">
                                <StarIcon className="w-6 h-6"/>
                            </div>
                            <div>
                                <h4 className="font-bold text-[#1A1A1E]">Lifetime Validity</h4>
                                <p className="text-xs text-[#5F6368] font-medium">Purchased credits never expire. Use them anytime.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ SECTION - Classic Clean Accordion */}
                <section className="py-12 bg-[#F6F7FA] px-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold text-[#1A1A1E] mb-2 tracking-tight">Got Questions?</h2>
                            <p className="text-[#5F6368] font-medium">Everything you need to know about credits and billing.</p>
                        </div>
                        
                        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-200 shadow-sm">
                            <div className="divide-y divide-gray-100">
                                {FAQ_ITEMS.map((item, i) => (
                                    <FAQItem key={i} item={item} />
                                ))}
                            </div>
                        </div>

                        <div className="mt-10 text-center">
                            <button 
                                onClick={() => navigateTo('dashboard', 'support_center')}
                                className="inline-flex items-center gap-2 text-sm font-bold text-[#4D7CFF] hover:text-blue-700 transition-colors"
                            >
                                Contact Support <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* CTA SECTION */}
                <section className="py-16 px-4 bg-white text-center">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1E] mb-8 leading-tight">Ready to transform your ideas <br/> into stunning visuals?</h2>
                        <button 
                            onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                            className="bg-[#1A1A1E] text-white py-5 px-12 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all inline-flex items-center justify-center gap-3"
                        >
                            Start Creating Now <ArrowRightIcon className="w-6 h-6" />
                        </button>
                    </div>
                </section>
            </main>

            <Footer navigateTo={navigateTo} />
            {successCredits !== null && (
                <PaymentSuccessModal 
                    creditsAdded={successCredits} 
                    packName={successPackName}
                    onClose={() => {
                        setSuccessCredits(null);
                        navigateTo('dashboard');
                    }} 
                />
            )}
        </div>
    );
};

export default PricingPage;