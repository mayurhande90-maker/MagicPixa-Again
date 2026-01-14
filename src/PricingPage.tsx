
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
                <section className="bg-white py-16 px-4">
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

                {/* PRICING GRID - Strictly using HomeStyles variables */}
                <section className={HomeStyles.pricingSection}>
                    <div className="max-w-7xl mx-auto">
                        <div className={HomeStyles.pricingGrid}>
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

                                return (
                                    <div 
                                        key={index} 
                                        className={`
                                            ${HomeStyles.pricingCard} 
                                            ${isCurrent 
                                                ? HomeStyles.pricingCardActive 
                                                : (pack.popular && !isDowngrade ? HomeStyles.pricingCardPopular : HomeStyles.pricingCardStandard)
                                            } 
                                            ${!isUpgrade && !isCurrent && auth.isAuthenticated ? 'opacity-70 bg-gray-50' : ''}
                                        `}
                                    >
                                        {/* ACTIVE PLAN BADGE */}
                                        {isCurrent && <div className={HomeStyles.activeBadge}>Current Plan</div>}

                                        {/* POPULAR BADGE */}
                                        {pack.popular && !isCurrent && !isDowngrade && (
                                            <p className="text-center bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase -mt-9 mb-6 mx-auto w-fit shadow-sm">
                                                Best Value
                                            </p>
                                        )}
                                        
                                        {/* Spacer for badge overlap */}
                                        {isCurrent && <div className="h-4"></div>}

                                        <h3 className="text-xl font-bold text-[#1A1A1E] mb-2">{pack.name}</h3>
                                        <p className="text-[#5F6368] text-sm mb-6 h-10 leading-snug">{pack.tagline}</p>
                                        
                                        <div className="mb-6">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-bold text-[#1A1A1E] tracking-tight">{pack.totalCredits}</span>
                                                <span className="text-[#5F6368] text-sm font-semibold uppercase tracking-wider">Credits</span>
                                            </div>
                                            {pack.bonus > 0 && (
                                                <div className="mt-2 flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                                    <SparklesIcon className="w-3.5 h-3.5" />
                                                    <span>Includes {pack.bonus} Bonus!</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-[#F6F7FA] border border-gray-200/80 rounded-xl p-4 text-center mb-8">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">One-Time Payment</p>
                                            <span className="text-2xl font-bold text-[#1A1A1E]">₹{pack.price}</span>
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
                                                ${HomeStyles.pricingButton} 
                                                ${auth.isAuthenticated 
                                                    ? (isCurrent 
                                                        ? HomeStyles.pricingButtonActive
                                                        : (isUpgrade 
                                                            ? HomeStyles.pricingButtonPopular
                                                            : 'bg-gray-100 text-gray-500 cursor-default hover:bg-gray-100'))
                                                    : HomeStyles.pricingButtonPopular
                                                }
                                            `}
                                        >
                                            {isLoading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : auth.isAuthenticated 
                                                ? (isCurrent ? <><CheckIcon className="w-4 h-4"/> Active</> : isDowngrade ? "Included" : "Upgrade Now")
                                                : "Get Started"
                                            }
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* TRUST BAR - Classic Design */}
                <section className="py-12 bg-white px-4 border-b border-gray-100">
                    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#4D7CFF] shrink-0">
                                <ShieldCheckIcon className="w-6 h-6"/>
                            </div>
                            <div>
                                <h4 className="font-bold text-[#1A1A1E]">Secure Checkout</h4>
                                <p className="text-xs text-[#5F6368] font-medium">Safe payments via Razorpay. UPI, Cards & Wallets.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-[#1A1A1E] shrink-0">
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
                <section className="py-24 bg-[#F6F7FA] px-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-[#1A1A1E] mb-2 tracking-tight">Got Questions?</h2>
                            <p className="text-[#5F6368] font-medium">Everything you need to know about credits and billing.</p>
                        </div>
                        
                        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm">
                            <div className="divide-y divide-gray-100">
                                {FAQ_ITEMS.map((item, i) => (
                                    <FAQItem key={i} item={item} />
                                ))}
                            </div>
                        </div>

                        <div className="mt-12 text-center">
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
                <section className="py-24 px-4 bg-white text-center">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1E] mb-8 leading-tight">Ready to transform your ideas <br/> into stunning visuals?</h2>
                        <button 
                            onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                            className={`${HomeStyles.heroButton} mx-auto`}
                        >
                            Start Creating Now
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