
import React, { useState } from 'react';
import { Page, AuthProps } from './App';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  ArrowRightIcon, SparklesIcon, BackgroundRemovalIcon, ColorizeIcon, InteriorIcon, ApparelIcon, MockupIcon, ScannerIcon, NotesIcon, CaptionIcon, FriendIcon, CheckIcon, StarIcon
} from './components/icons';

interface HomePageProps {
  navigateTo: (page: Page) => void;
  auth: AuthProps;
}

const features = [
    { title: 'Magic Photo Studio', description: 'Turn raw product photos into marketing-ready visuals.', icon: <SparklesIcon className="w-8 h-8 text-blue-500" />, category: 'A' },
    { title: 'Magic Background Removal', description: 'Remove any image background, download as PNG.', icon: <BackgroundRemovalIcon className="w-8 h-8 text-blue-500" />, category: 'A' },
    { title: 'Photo Colourise', description: 'Restore and colorize vintage B&W photos in HD.', icon: <ColorizeIcon className="w-8 h-8 text-blue-500" />, category: 'A' },
    { title: 'Magic Interior', description: 'Redesign your room or office with various AI styles.', icon: <InteriorIcon className="w-8 h-8 text-indigo-500" />, category: 'B' },
    { title: 'Magic Apparel', description: 'Try clothes on virtually with just a photo.', icon: <ApparelIcon className="w-8 h-8 text-indigo-500" />, category: 'B' },
    { title: 'Magic Mockup', description: 'Instantly see your logo on notebooks, t-shirts, etc.', icon: <MockupIcon className="w-8 h-8 text-indigo-500" />, category: 'B' },
    { title: 'Magic Scanner', description: 'Convert document photos into clean digital scans.', icon: <ScannerIcon className="w-8 h-8 text-amber-500" />, category: 'C' },
    { title: 'Magic Notes', description: 'Get AI-generated notes from textbooks or PDFs.', icon: <NotesIcon className="w-8 h-8 text-amber-500" />, category: 'C' },
    { title: 'CaptionAI', description: 'Get captions and hashtags for social media photos.', icon: <CaptionIcon className="w-8 h-8 text-amber-500" />, category: 'C' },
    { title: 'Magic Friend', description: 'Generate photos of you and a friend together.', icon: <FriendIcon className="w-8 h-8 text-purple-500" />, category: 'D' },
];

const reviews = [
    { name: "Sarah L.", role: "Product Designer", text: "As a designer, MagicPixa saves me hours every week. The Magic Mockup tool is an absolute game-changer for client presentations.", rating: 5, image: "https://randomuser.me/api/portraits/women/12.jpg" },
    { name: "Mike R.", role: "Entrepreneur", text: "Finally, one platform that handles all my photo needs for my e-commerce store. The product photo studio is top-notch!", rating: 5, image: "https://randomuser.me/api/portraits/men/45.jpg" },
    { name: "Jennifer Chen", role: "Real Estate Agent", text: "The interior design feature is unbelievable. I can show clients potential renovations in seconds. Highly recommended!", rating: 5, image: "https://randomuser.me/api/portraits/women/68.jpg" },
];

const HomePage: React.FC<HomePageProps> = ({ navigateTo, auth }) => {
  const [isYearly, setIsYearly] = useState(false);
  
  return (
    <>
      <Header navigateTo={navigateTo} auth={auth} />
      <main className="bg-white dark:bg-slate-950">
        {/* Hero Section */}
        <section className="relative text-center py-20 md:py-32 px-4">
            <div className="relative z-10 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-slate-50 mb-4 leading-tight">
                    Turn any image idea into magic — instantly.
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
                    Your all-in-one AI studio for photos, products, interiors, notes, and more.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 hover:bg-blue-700">
                        <SparklesIcon className="w-5 h-5" />
                        Try Magic Studio
                    </button>
                    <a href="#features" className="w-full sm:w-auto bg-transparent border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-3 px-6 rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-slate-800/50">
                        Explore Features
                    </a>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 bg-slate-50 dark:bg-black">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">One Platform, Infinite Creativity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-white dark:bg-slate-900/70 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:-translate-y-1">
                  <div className="flex items-center gap-4 mb-4">
                    {feature.icon}
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mb-6">{feature.description}</p>
                  <button onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                    Try Now <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4">
            <div className="max-w-7xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Pricing that scales with you</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-8">Get started for free, or unlock unlimited power.</p>
                <div className="flex justify-center items-center gap-4 mb-12">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Monthly</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isYearly} onChange={() => setIsYearly(!isYearly)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <span className="flex items-center font-medium text-slate-700 dark:text-slate-300">
                        Yearly <span className="ml-2 text-xs font-semibold bg-amber-400/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">20% OFF</span>
                    </span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                    {/* Free Plan */}
                    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl">
                        <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400 mb-2">Free Plan</h3>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white mb-2">$0</p>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">For starters and casual use.</p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Access to 3 features/day</li>
                            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Watermarked images</li>
                            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Limited downloads</li>
                        </ul>
                        <button onClick={() => auth.openAuthModal()} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold py-3 px-6 rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200">Sign Up for Free</button>
                    </div>
                    {/* Pro Plan */}
                    <div className="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border-2 border-blue-600">
                        <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400 mb-2">Pro Plan</h3>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{isYearly ? '$8' : '$10'}<span className="text-base font-normal text-slate-500 dark:text-slate-400">/month</span></p>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">For professionals and creators.</p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Unlimited feature access</li>
                            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> High-quality image downloads</li>
                            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> No watermark</li>
                            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Priority generation speed</li>
                        </ul>
                        <button onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 hover:bg-blue-700">Get Started with Pro</button>
                    </div>
                    {/* Business Plan */}
                    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl">
                        <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400 mb-2">Business Plan</h3>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{isYearly ? '$20' : '$25'}<span className="text-base font-normal text-slate-500 dark:text-slate-400">/month</span></p>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">For teams and agencies.</p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> All Pro features</li>
                            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Team workspace (5 users)</li>
                            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Priority support</li>
                            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Early access to new tools</li>
                        </ul>
                         <button className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold py-3 px-6 rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200">Contact Sales</button>
                    </div>
                </div>
            </div>
        </section>

        {/* Reviews Section */}
        <section id="reviews" className="py-20 px-4 bg-slate-50 dark:bg-black">
            <div className="max-w-7xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-12 text-slate-900 dark:text-white">See why users love MagicPixa</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {reviews.map((review, index) => (
                        <div key={index} className="bg-white dark:bg-slate-900/70 p-8 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center mb-4">
                                <img src={review.image} alt={review.name} className="w-12 h-12 rounded-full mr-4 border-2 border-blue-400" />
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">{review.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{review.role}</p>
                                </div>
                            </div>
                            <div className="flex mb-4">
                                {[...Array(review.rating)].map((_, i) => <StarIcon key={i} className="w-5 h-5 text-amber-400" />)}
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 text-left">"{review.text}"</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
        
        {/* Call to Action */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-12 rounded-2xl">
              <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Ready to Create Magic?</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-8">Sign up today and get started for free. No credit card required.</p>
              <button 
                onClick={() => auth.openAuthModal()}
                className="w-full max-w-sm flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 hover:bg-blue-700">
                <SparklesIcon className="w-5 h-5" />
                Get Started for Free
              </button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default HomePage;