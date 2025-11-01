

import React, { useState } from 'react';
import { Page, AuthProps, View } from './App';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, CheckIcon, StarIcon, PhotoStudioIcon, ScissorsIcon, NotesIcon, CaptionIcon, PaletteIcon, ScannerIcon, HomeIcon, UsersIcon, TshirtIcon
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
        id: 'eraser',
        icon: <ScissorsIcon className="w-10 h-10 text-white" />,
        title: "Magic Background Eraser",
        description: "Remove the background of any image and receive a transparent PNG, ready for any project.",
        color: "bg-emerald-500",
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
        id: null,
        icon: <ScannerIcon className="w-10 h-10 text-white" />,
        title: "Magic Scanner",
        description: "Turn photos of documents into high-quality, fully digital scanned copies with a single tap.",
        color: "bg-sky-500",
        disabled: true,
    },
    {
        id: null,
        icon: <TshirtIcon className="w-10 h-10 text-white" />,
        title: "Magic Mockup",
        description: "Upload your logo or design and our AI will automatically generate mockups on notebooks, t-shirts, and more.",
        color: "bg-indigo-500",
        disabled: true,
    },
    {
        id: null,
        icon: <UsersIcon className="w-10 h-10 text-white" />,
        title: "Magic with Friends",
        description: "Upload your photo and a friend's, and our AI will generate a new photo of you both together in fun settings.",
        color: "bg-pink-500",
        disabled: true,
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
        id: null,
        icon: <TshirtIcon className="w-10 h-10 text-white" />,
        title: "Magic Apparel",
        description: "Upload your photo and an item of clothing to see how it looks on you before you buy.",
        color: "bg-teal-500",
        disabled: true,
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

const pricingPlans = {
    yearly: [
        { name: 'Free', price: '0', credits: '5 one-time', popular: false, features: ['5 Credits', 'Standard Resolution', 'AI Photo Studio', 'Background Remover', 'Limited Support'] },
        { name: 'Pro', price: '299', credits: '100 / month', popular: false, features: ['100 Credits/month', 'High Resolution', 'AI Photo Studio', 'Background Remover', 'Image Upscaler (2x)', 'Email Support'] },
        { name: 'Pro Plus', price: '499', credits: '500 / month', popular: true, features: ['500 Credits/month', 'High Resolution', 'Full Feature Access', 'Image Upscaler (4x)', 'Priority Support'] },
        { name: 'VIP', price: '999', credits: '1000 / month', popular: false, features: ['1000 Credits/month', '4K Resolution', 'Full Feature Access', 'Image Upscaler (8x)', 'Dedicated Support'] }
    ],
    monthly: [
        { name: 'Free', price: '0', credits: '5 one-time', popular: false, features: ['5 Credits', 'Standard Resolution', 'AI Photo Studio', 'Background Remover', 'Limited Support'] },
        { name: 'Pro', price: '359', credits: '100 / month', popular: false, features: ['100 Credits/month', 'High Resolution', 'AI Photo Studio', 'Background Remover', 'Image Upscaler (2x)', 'Email Support'] },
        { name: 'Pro Plus', price: '599', credits: '500 / month', popular: true, features: ['500 Credits/month', 'High Resolution', 'Full Feature Access', 'Image Upscaler (4x)', 'Priority Support'] },
        { name: 'VIP', price: '1199', credits: '1000 / month', popular: false, features: ['1000 Credits/month', '4K Resolution', 'Full Feature Access', 'Image Upscaler (8x)', 'Dedicated Support'] }
    ]
};


const HomePage: React.FC<HomePageProps> = ({ navigateTo, auth }) => {
  const [isYearly, setIsYearly] = useState(true);
  
  return (
    <>
      <Header navigateTo={navigateTo} auth={auth} />
      <main className="bg-[#F9FAFB]">
        {/* Hero Section */}
        <section id="home" className="text-center py-20 px-4">
            <div className="relative max-w-5xl mx-auto bg-white p-12 md:p-20 rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
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
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 bg-[#F9FAFB]">
            <div className="max-w-6xl mx-auto text-center bg-white p-12 md:p-16 rounded-3xl shadow-sm border border-gray-200/80">
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
                <h2 className="text-3xl font-bold text-[#1E1E1E] mb-3">Choose Your Perfect Plan</h2>
                <p className="text-lg text-[#5F6368] mb-8">Simple, transparent pricing for everyone.</p>
                <div className="flex justify-center items-center gap-4 mb-12">
                    <span className={`font-semibold ${!isYearly ? 'text-[#0079F2]' : 'text-[#5F6368]'}`}>Monthly</span>
                    <label htmlFor="billing-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="billing-toggle" className="sr-only peer" checked={isYearly} onChange={() => setIsYearly(!isYearly)} />
                        <div className="w-14 h-8 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#0079F2]"></div>
                    </label>
                    <span className={`font-semibold ${isYearly ? 'text-[#0079F2]' : 'text-[#5F6368]'}`}>
                        Yearly <span className="text-sm font-normal bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">Save 20%</span>
                    </span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {(isYearly ? pricingPlans.yearly : pricingPlans.monthly).map((plan, index) => (
                        <div key={index} className={`bg-white p-8 rounded-2xl shadow-sm border-2 text-left flex flex-col ${plan.popular ? 'border-[#0079F2]' : 'border-gray-200/80'}`}>
                            {plan.popular && <p className="text-center bg-[#0079F2] text-white text-xs font-bold px-3 py-1 rounded-full uppercase -mt-10 mb-4 mx-auto">Most Popular</p>}
                            <h3 className="text-xl font-bold text-[#1E1E1E] mb-2">{plan.name}</h3>
                            <p className="text-[#5F6368] mb-4">{plan.credits}</p>
                            <p className="mb-6">
                                <span className="text-4xl font-bold text-[#1E1E1E]">₹{plan.price}</span>
                                <span className="text-[#5F6368]">/ month</span>
                            </p>
                            <ul className="space-y-3 text-[#5F6368] flex-grow">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <CheckIcon className="w-5 h-5 text-emerald-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button className={`w-full mt-8 py-3 rounded-xl font-semibold transition-colors ${plan.popular ? 'bg-[#0079F2] text-white hover:bg-blue-700' : 'bg-gray-100 text-[#1E1E1E] hover:bg-gray-200'}`}>
                                {plan.name === 'Free' ? 'Get Started' : 'Choose Plan'}
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

      </main>
      <Footer />
    </>
  );
};

export default HomePage;
// Minor change for commit.