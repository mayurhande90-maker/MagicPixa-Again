import React, { useState } from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, CheckIcon, StarIcon, PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, MockupIcon, ProjectsIcon, DashboardIcon, UserIcon as AvatarUserIcon, BrandKitIcon, LightbulbIcon, ThumbnailIcon, ApparelIcon, MagicAdsIcon, BuildingIcon, UploadTrayIcon, PixaProductIcon, PixaEcommerceIcon, PixaTogetherIcon, PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon, PixaMockupIcon, PixaHeadshotIcon, ShieldCheckIcon
} from './components/icons';
import { HomeStyles } from './styles/Home.styles';
import { triggerCheckout } from './services/paymentService';
import { PaymentSuccessModal } from './components/PaymentSuccessModal';

interface HomePageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  appConfig: AppConfig | null;
}

// Plan Hierarchy Definition (Matches Billing.tsx)
const PLAN_WEIGHTS: Record<string, number> = {
    'Free': 0,
    'Starter Pack': 1,
    'Creator Pack': 2,
    'Studio Pack': 3,
    'Agency Pack': 4
};

const features = [
    {
        id: 'studio',
        icon: <PixaProductIcon className="w-16 h-16" />,
        title: "Pixa Product Shots",
        description: "Transform simple photos into professional, studio-quality product shots in one click.",
        color: "",
        disabled: false,
    },
    {
        id: 'headshot',
        icon: <PixaHeadshotIcon className="w-16 h-16" />,
        title: "Pixa Headshot Pro",
        description: "Create studio-quality professional headshots from selfies for LinkedIn and resumes.",
        color: "",
        disabled: false,
    },
    {
        id: 'brand_kit',
        icon: <PixaEcommerceIcon className="w-16 h-16" />,
        title: "Pixa Ecommerce Kit",
        description: "Generate complete E-commerce product packs (Hero, Lifestyle, Detail) in one go.",
        color: "",
        disabled: false,
    },
    {
        id: 'brand_stylist',
        icon: <MagicAdsIcon className="w-16 h-16" />,
        title: "Pixa AdMaker",
        description: "Generate high-converting ad creatives instantly for any industry (Product, Realty, Food, SaaS).",
        color: "",
        disabled: false,
    },
    {
        id: 'thumbnail_studio',
        icon: <ThumbnailIcon className="w-16 h-16" />,
        title: "Pixa Thumbnail Pro",
        description: "Create click-worthy YouTube thumbnails in seconds. No design skills needed.",
        color: "",
        disabled: false,
    },
    {
        id: 'soul',
        icon: <PixaTogetherIcon className="w-16 h-16" />,
        title: "Pixa Together",
        description: "Combine two people into one hyper-realistic photo, choosing a theme and environment.",
        color: "",
        disabled: false,
    },
    {
        id: 'colour',
        icon: <PixaRestoreIcon className="w-16 h-16" />,
        title: "Pixa Photo Restore",
        description: "Breathe new life into vintage photos. Convert old black and white images into spotless, high-resolution color.",
        color: "",
        disabled: false,
    },
    {
        id: 'caption',
        icon: <PixaCaptionIcon className="w-16 h-16" />,
        title: "Pixa Caption Pro",
        description: "Upload a photo and instantly get engaging, copy-paste-ready captions and hashtags for social media.",
        color: "",
        disabled: false,
    },
    {
        id: 'interior',
        icon: <PixaInteriorIcon className="w-16 h-16" />,
        title: "Pixa Interior Design",
        description: "Upload a photo of your home or office and our AI will generate a fully furnished interior in your chosen style.",
        color: "",
        disabled: false,
    },
    {
        id: 'apparel',
        icon: <PixaTryOnIcon className="w-16 h-16" />,
        title: "Pixa TryOn",
        description: "Virtually try on any clothing on a person from a photo, creating a realistic look in seconds.",
        color: "",
        disabled: false,
    },
    {
        id: 'mockup',
        icon: <PixaMockupIcon className="w-16 h-16" />,
        title: "Pixa Mockups",
        description: "Upload your logo or design and our AI will automatically generate mockups on notebooks, t-shirts, and more.",
        color: "",
        disabled: false,
    }
];

const reviews = [
    {
        name: "Priya Sharma",
        location: "Bangalore",
        review: "MagicPixa has revolutionized my design workflow. The AI is incredibly intuitive. I can generate stunning product shots in minutes, not hours. A must-have for any e-commerce owner!",
    },
    {
        name: "Rohan Mehta",
        location: "Mumbai",
        review: "As a freelance photographer, I'm always looking for tools to enhance my work. The image upscaler is just magical! The quality is pristine. My clients are happier than ever.",
    },
    {
        name: "Anjali Desai",
        location: "Delhi",
        review: "I run a small boutique and creating marketing content was always a struggle. Pixa Product Shots is a lifesaver. It’s so easy to use, and the results are incredibly professional.",
    },
     {
        name: "Vikram Singh",
        location: "Chennai",
        review: "The background remover is the best I've ever used. Clean edges, super fast, and saved me a ton of time on tedious editing. The monthly credits are generous too!",
    },
];

const HomeMobileNav: React.FC<{ navigateTo: (page: Page, view?: View) => void; auth: AuthProps; }> = ({ navigateTo, auth }) => {
    const handleNav = (view: View) => {
        if (!auth.isAuthenticated) {
            auth.openAuthModal();
        } else {
            navigateTo('dashboard', 'dashboard' as View);
        }
    };

    const navItems: { view: View; label: string; icon: React.FC<{ className?: string }>; disabled?: boolean; }[] = [
        { view: 'home_dashboard' as View, label: 'Home', icon: HomeIcon },
        { view: 'dashboard', label: 'Features', icon: DashboardIcon },
        { view: 'creations', label: 'Projects', icon: ProjectsIcon },
        { view: 'profile', label: 'Profile', icon: AvatarUserIcon },
    ];
    
    return (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-lg border-t border-gray-200/80 z-[100] lg:hidden">
            <div className="flex justify-around items-center h-full">
                {navItems.map(item => (
                    <button key={item.label} onClick={() => handleNav(item.view as View)} disabled={item.disabled} className={`flex flex-col items-center gap-1 p-2 text-gray-500 disabled:text-gray-300`}>
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};


const HomePage: React.FC<HomePageProps> = ({ navigateTo, auth, appConfig }) => {
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [successCredits, setSuccessCredits] = useState<number | null>(null);

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
          onSuccess: (updatedUser, totalCredits) => {
              auth.setUser(updatedUser);
              setLoadingPackId(null);
              setSuccessCredits(totalCredits);
          },
          onCancel: () => setLoadingPackId(null),
          onError: (err) => {
              alert(err);
              setLoadingPackId(null);
          }
      });
  };

  const featuresWithConfig = features.map(f => {
    if (f.id && appConfig?.featureToggles && f.id in appConfig.featureToggles) {
        return { ...f, disabled: !appConfig.featureToggles[f.id] };
    }
    return f;
  });

  return (
    <>
      <Header navigateTo={navigateTo} auth={auth} />
      <main className={HomeStyles.main}>
        {/* Hero Section */}
        <section id="home" className={HomeStyles.heroSection}>
            <div className={HomeStyles.heroContainer}>
                <div className={HomeStyles.heroBackgroundGrid}></div>
                <div className={HomeStyles.heroBlob1}></div>
                <div className={HomeStyles.heroBlob2}></div>
                
                <div className={HomeStyles.heroContent}>
                    <h1 className={HomeStyles.heroTitle}>
                        Create Stunning Visuals, <span className="text-[#4D7CFF]">No Prompt Required</span>
                    </h1>
                    <p className={HomeStyles.heroSubtitle}>
                        MagicPixa understands what you need. Turn your simple photos into masterpieces effortlessly.
                    </p>
                    <button 
                      onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} 
                      className={HomeStyles.heroButton}
                    >
                        Start Creating for Free
                    </button>
                    <p className="text-sm text-gray-500 mt-4">Get 50 free credits on sign up!</p>
                </div>
            </div>
        </section>

        {/* Sections below are hidden on mobile to provide a focused, non-scrolling experience */}
        <div className="hidden lg:block">
            {/* Features Section */}
            <section id="features" className={HomeStyles.featuresSection}>
                <div className={HomeStyles.featuresContainer}>
                    <h2 className={HomeStyles.sectionHeader}>Everything You Need to Create</h2>
                    <p className={HomeStyles.sectionSubheader}>One powerful toolkit for all your creative needs.</p>
                    <div className={HomeStyles.featureGrid}>
                        {featuresWithConfig.map((feature, index) => (
                            <div 
                                key={index} 
                                onClick={() => !feature.disabled && feature.id && navigateTo('dashboard', feature.id as View)}
                                className={`${HomeStyles.featureCard} ${feature.disabled ? HomeStyles.featureCardDisabled : HomeStyles.featureCardEnabled}`}
                            >
                                {feature.disabled && (
                                    <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        Coming Soon
                                    </div>
                                )}
                                <div className={`${HomeStyles.featureIconContainer} ${feature.color}`}>
                                    {feature.icon}
                                </div>
                                <h3 className={HomeStyles.featureTitle}>{feature.title}</h3>
                                <p className={HomeStyles.featureDescription}>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Reviews Section */}
            <section id="reviews" className={HomeStyles.reviewsSection}>
                <div className={HomeStyles.reviewsContainer}>
                    <h2 className={HomeStyles.sectionHeader}>Loved by Creators Everywhere</h2>
                    <p className={HomeStyles.sectionSubheader}>Don't just take our word for it. Here's what our users say.</p>
                    <div className={HomeStyles.reviewsGrid}>
                        {reviews.map((review, index) => (
                            <div key={index} className={HomeStyles.reviewCard}>
                                <div className="flex items-center mb-4">
                                    {[...Array(5)].map((_, i) => <StarIcon key={i} className="w-5 h-5 text-yellow-400" />)}
                                </div>
                                <p className="text-[#5F6368] mb-6 italic">"{review.review}"</p>
                                <div>
                                    <p className="font-bold text-[#1A1A1E]">{review.name}</p>
                                    <p className="text-sm text-[#5F6368]">{review.location}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className={HomeStyles.pricingSection}>
                <div className={HomeStyles.reviewsContainer}>
                    <h2 className={HomeStyles.sectionHeader}>Upgrade Membership</h2>
                    <p className={HomeStyles.sectionSubheader}>Unlock higher tiers for more perks and bulk savings.</p>
                    
                    <div className={HomeStyles.pricingGrid}>
                        {creditPacks.map((pack, index) => {
                            // Calculate Logic based on Auth Status
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

                                    {/* POPULAR BADGE (Only if not current AND not a downgrade) */}
                                    {pack.popular && !isCurrent && !isDowngrade && <p className="text-center bg-[#F9D230] text-[#1A1A1E] text-xs font-bold px-3 py-1 rounded-full uppercase -mt-9 mb-4 mx-auto">Best Value</p>}
                                    
                                    {/* Spacer if active to handle badge overlap visually */}
                                    {isCurrent && <div className="h-2"></div>}

                                    <h3 className={HomeStyles.featureTitle}>{pack.name}</h3>
                                    <p className="text-[#5F6368] text-sm mb-4 h-10">{pack.tagline}</p>
                                    
                                    <div className="my-2">
                                        <span className="text-4xl font-bold text-[#1A1A1E]">
                                            {pack.totalCredits}
                                        </span>
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
                                        <span className="text-2xl font-bold text-[#1A1A1E]">₹{pack.price}</span>
                                        <p className="text-xs text-gray-500">One-time payment</p>
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
                                                        ? (pack.popular && !isDowngrade ? HomeStyles.pricingButtonPopular : HomeStyles.pricingButtonStandard)
                                                        : 'bg-gray-200 text-gray-500 cursor-default hover:bg-gray-200'))
                                                : (pack.popular ? HomeStyles.pricingButtonPopular : HomeStyles.pricingButtonStandard)
                                            }
                                        `}
                                    >
                                        {isLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : auth.isAuthenticated 
                                            ? (isCurrent ? <><CheckIcon className="w-5 h-5"/> Active</> : isDowngrade ? "Included" : "Upgrade")
                                            : "Buy Now"
                                        }
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
      </main>
      <HomeMobileNav navigateTo={navigateTo} auth={auth} />
      <div className="hidden lg:block">
        <Footer navigateTo={navigateTo} />
      </div>
      {successCredits !== null && (
          <PaymentSuccessModal 
            creditsAdded={successCredits} 
            onClose={() => {
                setSuccessCredits(null);
                navigateTo('dashboard');
            }} 
          />
      )}
    </>
  );
};

export default HomePage;