
import React, { useState } from 'react';
import { Page, AuthProps } from './App';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  CheckIcon, StarIcon, PaletteIcon, LightningBoltIcon, DownloadIcon
} from './components/icons';

interface HomePageProps {
  navigateTo: (page: Page) => void;
  auth: AuthProps;
}

const reviews = [
    { name: "Sarah L.", role: "Product Designer", text: "MagicPixa has completely changed my workflow. The ability to generate consistent, on-brand assets without writing a single prompt is a lifesaver.", rating: 5, image: "https://randomuser.me/api/portraits/women/12.jpg" },
    { name: "Mike R.", role: "E-commerce Owner", text: "I used to spend thousands on product photography. Now, I can create stunning, professional-grade product shots in seconds. The ROI is insane!", rating: 5, image: "https://randomuser.me/api/portraits/men/45.jpg" },
    { name: "Jennifer Chen", role: "Marketing Manager", text: "Our social media engagement is through the roof. We can generate endless variations of creative visuals for our campaigns, keeping our feed fresh and exciting.", rating: 5, image: "https://randomuser.me/api/portraits/women/68.jpg" },
];

const features = [
  'Zero prompts required, just your creativity.',
  'Generate brand-consistent assets every time.',
  'Download in high-resolution for any use case.',
  'One-click export to your favorite tools.'
];

const HomePage: React.FC<HomePageProps> = ({ navigateTo, auth }) => {
  const [isYearly, setIsYearly] = useState(true);
  
  return (
    <>
      <Header navigateTo={navigateTo} auth={auth} />
      <main className="bg-slate-50 dark:bg-slate-950">
        {/* Hero Section */}
        <section className="relative text-center py-24 md:py-40 px-4 overflow-hidden">
            <div 
              className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-[800px] h-[800px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" 
              aria-hidden="true"
            />
            <div className="relative z-10 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
                    Create, No Prompt Required.
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10">
                    Instant image generation, zero typing.
                </p>
                <div className="flex items-center justify-center">
                    <button 
                      onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} 
                      className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg transition-transform hover:scale-105 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                    >
                        Try MagicPixa Now
                    </button>
                </div>
            </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 px-4">
            <div className="max-w-7xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">How It Works</h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-12">It's as easy as 1, 2, 3.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
                        <PaletteIcon className="w-10 h-10 text-blue-600 dark:text-blue-500 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Choose Your Style</h3>
                        <p className="text-slate-500 dark:text-slate-400">Select from a curated library of visual styles or upload your own brand kit.</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
                        <LightningBoltIcon className="w-10 h-10 text-blue-600 dark:text-blue-500 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Generate Instantly</h3>
                        <p className="text-slate-500 dark:text-slate-400">Our AI generates stunning, unique images in seconds based on your chosen style.</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
                        <DownloadIcon className="w-10 h-10 text-blue-600 dark:text-blue-500 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Download & Use</h3>
                        <p className="text-slate-500 dark:text-slate-400">Export your high-resolution images and use them anywhere you want.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="bg-slate-100 dark:bg-slate-800/50 aspect-video rounded-lg flex items-center justify-center">
                      <p className="text-slate-400 dark:text-slate-500">Image Generation Demo</p>
                  </div>
              </div>
              <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">Powerful Features, Effortless Creation</h2>
                  <ul className="space-y-4">
                      {features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-3 text-lg text-slate-700 dark:text-slate-300">
                            <CheckIcon className="w-6 h-6 text-blue-500" /> 
                            <span>{feature}</span>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4 bg-white dark:bg-black">
            <div className="max-w-7xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Pricing that scales with you</h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">Get started for free, or unlock unlimited power.</p>
                <div className="flex justify-center items-center gap-4 mb-12">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Monthly</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isYearly} onChange={() => setIsYearly(!isYearly)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <span className="flex items-center font-medium text-slate-700 dark:text-slate-300">
                        Yearly <span className="ml-2 text-xs font-semibold bg-amber-400/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">Save 20%</span>
                    </span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
                    {/* Free Plan */}
                    <div className="bg-slate-50 dark:bg-slate-900/70 p-8 rounded-xl">
                        <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">Free</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">For starters and casual use.</p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white mb-6">$0</p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> 10 free credits</li>
                            <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Basic image generation</li>
                            <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Standard resolution</li>
                        </ul>
                        <button onClick={() => auth.openAuthModal()} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200">Sign Up for Free</button>
                    </div>
                    {/* Pro Plan */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-2xl shadow-blue-500/10 border-2 border-blue-600 relative">
                        <p className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</p>
                        <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">Pro</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">For professionals and creators.</p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{isYearly ? '$8' : '$10'}<span className="text-base font-normal text-slate-500 dark:text-slate-400">/mo</span></p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Unlimited generations</li>
                            <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> High-resolution downloads</li>
                            <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Full style library access</li>
                            <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Priority support</li>
                        </ul>
                        <button onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-blue-700">Get Started with Pro</button>
                    </div>
                    {/* Enterprise Plan */}
                    <div className="bg-slate-50 dark:bg-slate-900/70 p-8 rounded-xl">
                        <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">Enterprise</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">For teams and agencies.</p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white mb-6">Let's Talk</p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> All Pro features</li>
                            <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Team collaboration tools</li>
                            <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Custom style models</li>
                            <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-blue-500" /> Dedicated account manager</li>
                        </ul>
                         <button className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200">Contact Sales</button>
                    </div>
                </div>
            </div>
        </section>

        {/* Reviews Section */}
        <section id="reviews" className="py-20 px-4">
            <div className="max-w-7xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-12 text-slate-900 dark:text-white">Loved by creators worldwide</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {reviews.map((review, index) => (
                        <div key={index} className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center mb-4">
                                <img src={review.image} alt={review.name} className="w-12 h-12 rounded-full mr-4" />
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white text-left">{review.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 text-left">{review.role}</p>
                                </div>
                            </div>
                            <div className="flex mb-4">
                                {[...Array(review.rating)].map((_, i) => <StarIcon key={i} className="w-5 h-5 text-amber-400" />)}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-left">"{review.text}"</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
        
        {/* Call to Action */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Ready to Create Magic?</h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">Sign up today and get 10 free credits. No credit card required.</p>
              <button 
                onClick={() => auth.openAuthModal()}
                className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg transition-transform hover:scale-105 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
              >
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