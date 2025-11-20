
import React from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, StarIcon, PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, MockupIcon, ScannerIcon, NotesIcon, ProjectsIcon, DashboardIcon, UserIcon as AvatarUserIcon, ProductStudioIcon, LightbulbIcon, ThumbnailIcon
} from './components/icons';

interface HomePageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  appConfig: AppConfig | null;
}

const features = [
    {
        id: 'studio',
        icon: <PhotoStudioIcon className="w-10 h-10 text-white" />,
        title: "Magic Photo Studio",
        description: "Transform simple photos into professional, studio-quality product shots in one click.",
        color: "from-blue-500 to-indigo-600",
        disabled: false,
    },
    {
        id: 'product_studio',
        icon: <ProductStudioIcon className="w-10 h-10 text-white" />,
        title: "Product Studio",
        description: "Automatically create a full product pack from just a photo and product name.",
        color: "from-green-500 to-emerald-600",
        disabled: false,
    },
    {
        id: 'brand_stylist',
        icon: <LightbulbIcon className="w-10 h-10 text-white" />,
        title: "Brand Stylist AI",
        description: "Generate on-brand photos or graphics in the exact style of any reference image.",
        color: "from-yellow-400 to-orange-500",
        disabled: false,
    },
    {
        id: 'thumbnail_studio',
        icon: <ThumbnailIcon className="w-10 h-10 text-white" />,
        title: "Thumbnail Studio",
        description: "Create click-worthy YouTube thumbnails in seconds. No design skills needed.",
        color: "from-red-500 to-pink-600",
        disabled: false,
    },
    {
        id: 'soul',
        icon: <UsersIcon className="w-10 h-10 text-white" />,
        title: "Magic Soul",
        description: "Combine two people into one hyper-realistic photo, choosing a theme and environment.",
        color: "from-pink-500 to-rose-500",
        disabled: false,
    },
    {
        id: 'colour',
        icon: <PaletteIcon className="w-10 h-10 text-white" />,
        title: "Magic Photo Colour",
        description: "Breathe new life into vintage photos. Convert old black and white images into spotless, high-resolution color.",
        color: "from-rose-500 to-red-600",
        disabled: false,
    },
    {
        id: 'caption',
        icon: <CaptionIcon className="w-10 h-10 text-white" />,
        title: "CaptionAI",
        description: "Upload a photo and instantly get engaging, copy-paste-ready captions and hashtags for social media.",
        color: "from-amber-400 to-orange-500",
        disabled: false,
    },
    {
        id: 'interior',
        icon: <HomeIcon className="w-10 h-10 text-white" />,
        title: "Magic Interior",
        description: "Upload a photo of your home or office and our AI will generate a fully furnished interior in your chosen style.",
        color: "from-orange-500 to-amber-600",
        disabled: false,
    },
    {
        id: 'apparel',
        icon: <UsersIcon className="w-10 h-10 text-white" />,
        title: "Magic Apparel",
        description: "Virtually try on any clothing on a person from a photo, creating a realistic look in seconds.",
        color: "from-teal-400 to-cyan-500",
        disabled: false,
    },
    {
        id: 'mockup',
        icon: <MockupIcon className="w-10 h-10 text-white" />,
        title: "Magic Mockup",
        description: "Upload your logo or design and our AI will automatically generate mockups on notebooks, t-shirts, and more.",
        color: "from-indigo-500 to-purple-600",
        disabled: false,
    },
    {
        id: 'scanner',
        icon: <ScannerIcon className="w-10 h-10 text-white" />,
        title: "Magic Scanner",
        description: "Turn photos of documents into high-quality, fully digital scanned copies with a single tap.",
        color: "from-sky-500 to-blue-600",
        disabled: true,
    },
    {
        id: 'notes',
        icon: <NotesIcon className="w-10 h-10 text-white" />,
        title: "Magic Notes",
        description: "Upload a textbook or long PDF and our AI will generate key points and notes to help you study smarter.",
        color: "from-purple-500 to-violet-600",
        disabled: true,
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
        review: "I run a small boutique and creating marketing content was always a struggle. MagicPixa's Photo Studio is a lifesaver. It’s so easy to use, and the results are incredibly professional.",
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
            navigateTo('dashboard', view);
        }
    };

    const navItems: { view: View; label: string; icon: React.FC<{ className?: string }>; disabled?: boolean; }[] = [
        { view: 'home_dashboard', label: 'Home', icon: HomeIcon },
        { view: 'dashboard', label: 'Features', icon: DashboardIcon },
        { view: 'creations', label: 'Projects', icon: ProjectsIcon },
        { view: 'profile', label: 'Profile', icon: AvatarUserIcon },
    ];
    
    return (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#0f172a]/90 backdrop-blur-lg border-t border-white/10 z-[100] lg:hidden">
            <div className="flex justify-around items-center h-full">
                {navItems.map(item => (
                    <button key={item.label} onClick={() => handleNav(item.view as View)} disabled={item.disabled} className={`flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-white disabled:text-gray-700`}>
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};


const HomePage: React.FC<HomePageProps> = ({ navigateTo, auth, appConfig }) => {
  const creditPacks = appConfig?.creditPacks || [];

  const featuresWithConfig = features.map(f => {
    if (f.id && appConfig?.featureToggles && f.id in appConfig.featureToggles) {
        return { ...f, disabled: !appConfig.featureToggles[f.id] };
    }
    return f;
  });


  return (
    <>
      {/* Header with Dark Theme */}
      <Header navigateTo={navigateTo} auth={auth} theme="dark" />
      
      <main className="bg-[#0f172a] pb-20 lg:pb-0 min-h-screen relative overflow-hidden">
        {/* Global Background Blobs */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-blob"></div>
            <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/3 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse"></div>
        </div>

        {/* Hero Section */}
        <section id="home" className="text-center py-20 px-4 relative z-10">
            <div className="relative max-w-5xl mx-auto bg-white/5 backdrop-blur-xl p-8 sm:p-12 md:p-20 rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(to_bottom,white_90%,transparent)]"></div>
                
                <div className="relative z-10 max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-7xl font-bold text-white mb-6 leading-tight">
                        Create Stunning Visuals, <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4D7CFF] to-[#6EFACC]">No Prompt Required</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10">
                        MagicPixa understands what you need. Turn your simple photos into masterpieces effortlessly using advanced AI tools.
                    </p>
                    <button 
                      onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} 
                      className="bg-[#F9D230] text-[#1A1A1E] font-bold py-4 px-10 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg shadow-yellow-500/20 hover:bg-[#dfbc2b] text-lg"
                    >
                        Start Creating for Free
                    </button>
                    <p className="text-sm text-gray-400 mt-4">Get 10 free credits on sign up!</p>
                </div>
            </div>
        </section>

        {/* Desktop Sections */}
        <div className="hidden lg:block relative z-10">
            {/* Features Section */}
            <section id="features" className="py-20 px-4">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Everything You Need</h2>
                    <p className="text-lg text-gray-400 mb-16">One powerful toolkit for all your creative needs.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuresWithConfig.map((feature, index) => (
                            <div 
                                key={index} 
                                onClick={() => !feature.disabled && feature.id && navigateTo('dashboard', feature.id as View)}
                                className={`group relative bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 text-left transition-all duration-300 ${feature.disabled ? 'opacity-60 cursor-not-allowed' : 'transform hover:-translate-y-2 hover:bg-white/10 cursor-pointer hover:border-white/20 hover:shadow-2xl'}`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`}></div>
                                {feature.disabled && (
                                    <div className="absolute top-4 right-4 bg-gray-700/50 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-full border border-white/10">
                                        Coming Soon
                                    </div>
                                )}
                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br ${feature.color} shadow-lg shadow-black/20`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Reviews Section */}
            <section id="reviews" className="py-20 px-4">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Loved by Creators</h2>
                    <p className="text-lg text-gray-400 mb-16">Don't just take our word for it.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {reviews.map((review, index) => (
                            <div key={index} className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 text-left hover:bg-white/10 transition-colors">
                                <div className="flex items-center mb-4 space-x-1">
                                    {[...Array(5)].map((_, i) => <StarIcon key={i} className="w-5 h-5 text-[#F9D230]" />)}
                                </div>
                                <p className="text-gray-300 mb-6 italic">"{review.review}"</p>
                                <div>
                                    <p className="font-bold text-white">{review.name}</p>
                                    <p className="text-sm text-gray-500">{review.location}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 px-4">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Recharge Energy</h2>
                    <p className="text-lg text-gray-400 mb-16">Simple credit packs. No subscriptions.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                        {creditPacks.map((pack, index) => (
                            <div key={index} className={`bg-white/5 backdrop-blur-md p-6 rounded-2xl border flex flex-col transition-transform transform hover:-translate-y-2 ${pack.popular ? 'border-[#F9D230] shadow-lg shadow-[#F9D230]/10 bg-[#F9D230]/5' : 'border-white/10 hover:border-white/20'}`}>
                                {pack.popular && <p className="text-center bg-[#F9D230] text-[#1A1A1E] text-xs font-bold px-3 py-1 rounded-full uppercase -mt-9 mb-4 mx-auto shadow-lg">Best Value</p>}
                                <h3 className="text-xl font-bold text-white mb-2">{pack.name}</h3>
                                <p className="text-gray-400 text-xs mb-6 h-8">{pack.tagline}</p>
                                
                                <div className="my-2">
                                    <span className="text-4xl font-bold text-white">
                                        {pack.totalCredits}
                                    </span>
                                    <span className="text-gray-400 ml-1 text-sm">Credits</span>
                                </div>
                                <div className="h-6 mb-6">
                                  {pack.bonus > 0 && (
                                      <p className="text-xs font-bold text-[#6EFACC] bg-[#6EFACC]/10 px-2 py-1 rounded inline-block">
                                          +{pack.bonus} Bonus!
                                      </p>
                                  )}
                                </div>
                                
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center mb-6">
                                    <span className="text-2xl font-bold text-white">₹{pack.price}</span>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">One-time payment</p>
                                </div>
                                
                                <button 
                                    onClick={() => navigateTo('dashboard', 'billing')}
                                    className={`w-full mt-auto py-3 rounded-xl font-bold transition-all text-sm ${pack.popular ? 'bg-[#F9D230] text-[#1A1A1E] hover:bg-[#dfbc2b]' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
                                >
                                    Buy Now
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
      </main>
      
      {/* Footer with Dark Theme */}
      <div className="hidden lg:block">
        <Footer navigateTo={navigateTo} theme="dark" />
      </div>
    </>
  );
};

export default HomePage;
