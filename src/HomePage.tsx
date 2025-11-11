import React from 'react';
import { Page, AuthProps, View } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
// FIX: Added missing ProjectsIcon to the import list.
import { 
  SparklesIcon, CheckIcon, StarIcon, PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, MockupIcon, ScannerIcon, NotesIcon, ProjectsIcon, DashboardIcon, UserIcon as AvatarUserIcon
} from './components/icons';

interface HomePageProps {
  navigateTo: (page: Page, view?: View) => void;
  auth: AuthProps;
}

const features = [
    {
        id: 'studio',
        icon: <PhotoStudioIcon className="w-10 h-10 text-white" />,
        title: "Magic Photo Studio",
        description: "Transform simple photos into professional, studio-quality product shots in one click.",
        color: "bg-blue-500",
        disabled: false,
    },
    {
        id: 'soul',
        icon: <UsersIcon className="w-10 h-10 text-white" />,
        title: "Magic Soul",
        description: "Combine two people into one hyper-realistic photo, choosing a theme and environment.",
        color: "bg-pink-500",
        disabled: false,
    },
    {
        id: 'colour',
        icon: <PaletteIcon className="w-10 h-10 text-white" />,
        title: "Magic Photo Colour",
        description: "Breathe new life into vintage photos. Convert old black and white images into spotless, high-resolution color.",
        color: "bg-rose-500",
        disabled: false,
    },
    {
        id: 'caption',
        icon: <CaptionIcon className="w-10 h-10 text-white" />,
        title: "CaptionAI",
        description: "Upload a photo and instantly get engaging, copy-paste-ready captions and hashtags for social media.",
        color: "bg-amber-500",
        disabled: false,
    },
    {
        id: 'interior',
        icon: <HomeIcon className="w-10 h-10 text-white" />,
        title: "Magic Interior",
        description: "Upload a photo of your home or office and our AI will generate a fully furnished interior in your chosen style.",
        color: "bg-orange-500",
        disabled: false,
    },
    {
        id: 'apparel',
        icon: <UsersIcon className="w-10 h-10 text-white" />,
        title: "Magic Apparel",
        description: "Virtually try on any clothing on a person from a photo, creating a realistic look in seconds.",
        color: "bg-teal-500",
        disabled: false,
    },
    {
        id: null,
        icon: <ScannerIcon className="w-10 h-10 text-white" />,
        title: "Magic Scanner",
        description: "Turn photos of documents into high-quality, fully digital scanned copies with a single tap.",
        color: "bg-sky-500",
        disabled: true,
    },
    {
        id: 'mockup',
        icon: <MockupIcon className="w-10 h-10 text-white" />,
        title: "Magic Mockup",
        description: "Upload your logo or design and our AI will automatically generate mockups on notebooks, t-shirts, and more.",
        color: "bg-indigo-500",
        disabled: false,
    },
    {
        id: null,
        icon: <NotesIcon className="w-10 h-10 text-white" />,
        title: "Magic Notes",
        description: "Upload a textbook or long PDF and our AI will generate key points and notes to help you study smarter.",
        color: "bg-purple-500",
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

const creditPacks = [
  {
    name: 'Starter Pack',
    price: '99',
    credits: 50,
    totalCredits: 50,
    bonus: 0,
    tagline: 'For quick tests & personal use',
    popular: false,
    value: 1.98,
  },
  {
    name: 'Creator Pack',
    price: '249',
    credits: 150,
    totalCredits: 165,
    bonus: 15,
    tagline: 'For creators & influencers — extra credits included!',
    popular: true,
    value: 1.51,
  },
  {
    name: 'Studio Pack',
    price: '699',
    credits: 500,
    totalCredits: 575,
    bonus: 75,
    tagline: 'For professional video and design teams',
    popular: false,
    value: 1.21,
  },
  {
    name: 'Agency Pack',
    price: '1199',
    credits: 1000,
    totalCredits: 1200,
    bonus: 200,
    tagline: 'For studios and agencies — biggest savings!',
    popular: false,
    value: 0.99,
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
        { view: 'creations', label: 'Projects', icon: ProjectsIcon, disabled: true },
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


const HomePage: React.FC<HomePageProps> = ({ navigateTo, auth }) => {
  return (
    <>
      <Header navigateTo={navigateTo} auth={auth} />
      <main className="bg-[#F9FAFB] pb-20 lg:pb-0">
        {/* Hero Section */}
        <section id="home" className="text-center py-20 px-4">
            <div className="relative max-w-5xl mx-auto bg-white p-8 sm:p-12 md:p-20 rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
                <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(to_bottom,white_90%,transparent)]"></div>
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-yellow-200/50 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-pink-200/50 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
                
                <div className="relative z-10 max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-bold text-[#1E1E1E] mb-4 leading-tight">
                        Create Stunning Visuals, <span className="text-[#0079F2]">No Prompt Required</span>
                    </h1>
                    <p className="text-lg md:text-xl text-[#5F6368] max-w-2xl mx-auto mb-10">
                        MagicPixa understands what you need. Turn your simple photos into masterpieces effortlessly.
                    </p>
                    <button 
                      onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} 
                      className="bg-[#f9d230] text-[#1E1E1E] font-semibold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg shadow-[#f9d230]/40"
                    >
                        Start Creating for Free
                    </button>
                    <p className="text-sm text-gray-500 mt-4">Get 10 free credits on sign up!</p>
                </div>
            </div>
        </section>

        {/* Sections below are hidden on mobile to provide a focused, non-scrolling experience */}
        <div className="hidden lg:block">
            {/* Features Section */}
            <section id="features" className="py-20 px-4 bg-[#F9FAFB]">
                <div className="max-w-6xl mx-auto text-center bg-white p-8 sm:p-12 md:p-16 rounded-3xl shadow-sm border border-gray-200/80">
                    <h2 className="text-3xl font-bold text-[#1E1E1E] mb-3">Everything You Need to Create</h2>
                    <p className="text-lg text-[#5F6368] mb-12">One powerful toolkit for all your creative needs.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div 
                                key={index} 
                                onClick={() => !feature.disabled && feature.id && navigateTo('dashboard', feature.id as View)}
                                className={`relative bg-white p-8 rounded-2xl shadow-sm border border-gray-200/80 text-left transition-transform duration-300 ${feature.disabled ? 'opacity-60 cursor-not-allowed' : 'transform hover:-translate-y-2 cursor-pointer'}`}
                            >
                                {feature.disabled && (
                                    <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        Coming Soon
                                    </div>
                                )}
                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${feature.color}`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-[#1E1E1E] mb-2">{feature.title}</h3>
                                <p className="text-[#5F6368]">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Reviews Section */}
            <section id="reviews" className="py-20 px-4 bg-white">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-[#1E1E1E] mb-3">Loved by Creators Everywhere</h2>
                    <p className="text-lg text-[#5F6368] mb-12">Don't just take our word for it. Here's what our users say.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {reviews.map((review, index) => (
                            <div key={index} className="bg-[#F9FAFB] p-8 rounded-2xl shadow-sm border border-gray-200/80 text-left">
                                <div className="flex items-center mb-4">
                                    {[...Array(5)].map((_, i) => <StarIcon key={i} className="w-5 h-5 text-yellow-400" />)}
                                </div>
                                <p className="text-[#5F6368] mb-6 italic">"{review.review}"</p>
                                <div>
                                    <p className="font-bold text-[#1E1E1E]">{review.name}</p>
                                    <p className="text-sm text-[#5F6368]">{review.location}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 px-4 bg-[#F9FAFB]">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-[#1E1E1E] mb-3">Recharge Your Creative Energy</h2>
                    <p className="text-lg text-[#5F6368] mb-12">Simple, one-time credit packs. No subscriptions needed.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
                        {creditPacks.map((pack, index) => (
                            <div key={index} className={`bg-white p-6 rounded-2xl shadow-sm border-2 text-left flex flex-col transition-transform transform hover:-translate-y-2 ${pack.popular ? 'border-[#0079F2] shadow-lg shadow-blue-500/10' : 'border-gray-200/80'}`}>
                                {pack.popular && <p className="text-center bg-[#0079F2] text-white text-xs font-bold px-3 py-1 rounded-full uppercase -mt-9 mb-4 mx-auto">Best Value</p>}
                                <h3 className="text-xl font-bold text-[#1E1E1E] mb-2">{pack.name}</h3>
                                <p className="text-[#5F6368] text-sm mb-4 h-10">{pack.tagline}</p>
                                
                                <div className="my-2">
                                    <span className="text-4xl font-bold text-[#1E1E1E]">
                                        {pack.totalCredits}
                                    </span>
                                    <span className="text-[#5F6368] ml-1">Credits</span>
                                </div>
                                {pack.bonus > 0 && (
                                    <p className="text-sm font-semibold text-emerald-500 mb-4">
                                        {pack.credits} + {pack.bonus} Bonus!
                                    </p>
                                )}
                                
                                <div className="bg-gray-50 border border-gray-200/80 rounded-lg p-3 text-center mb-6">
                                    <span className="text-2xl font-bold text-[#1E1E1E]">₹{pack.price}</span>
                                    <p className="text-xs text-gray-500">One-time payment</p>
                                </div>
                                
                                <button 
                                    onClick={() => navigateTo('dashboard', 'billing')}
                                    className={`w-full mt-auto py-3 rounded-xl font-semibold transition-colors ${pack.popular ? 'bg-[#0079F2] text-white hover:bg-blue-700' : 'bg-gray-100 text-[#1E1E1E] hover:bg-gray-200'}`}
                                >
                                    Buy Now
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Us Section */}
            <section id="about" className="py-20 px-4 bg-white">
            <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl font-bold text-[#1E1E1E] mb-3">Our Mission</h2>
                <p className="text-lg text-[#5F6368]">
                At MagicPixa, we believe that creativity should be accessible to everyone. Our mission is to empower individuals and businesses with powerful, intuitive AI tools that make professional-quality visual content creation as simple as a single click. We're dedicated to pushing the boundaries of what's possible, so you can focus on what matters most: bringing your ideas to life.
                </p>
            </div>
            </section>
        </div>
      </main>
      <HomeMobileNav navigateTo={navigateTo} auth={auth} />
      <div className="hidden lg:block">
        <Footer />
      </div>
    </>
  );
};

export default HomePage;
// Minor change for commit.
