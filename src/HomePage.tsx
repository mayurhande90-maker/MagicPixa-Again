
import React from 'react';
import { Page, AuthProps } from './App';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  PaletteIcon, LightningBoltIcon, DownloadIcon
} from './components/icons';

interface HomePageProps {
  navigateTo: (page: Page) => void;
  auth: AuthProps;
}

const HomePage: React.FC<HomePageProps> = ({ navigateTo, auth }) => {
  
  return (
    <>
      <Header navigateTo={navigateTo} auth={auth} />
      <main className="bg-[#F9FAFB]">
        {/* Hero Section */}
        <section className="relative text-center py-24 md:py-40 px-4 overflow-hidden">
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-yellow-300/20 rounded-full blur-3xl" 
              aria-hidden="true"
            />
            <div 
              className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/3 w-[800px] h-[800px] bg-blue-300/20 rounded-full blur-3xl" 
              aria-hidden="true"
            />
             <div 
              className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-300/20 rounded-full blur-3xl" 
              aria-hidden="true"
            />
            <div className="relative z-10 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-bold text-[#1E1E1E] mb-4 leading-tight uppercase tracking-wide">
                    Create, No Prompt Required
                </h1>
                <p className="text-lg md:text-xl text-[#5F6368] max-w-2xl mx-auto mb-10">
                    AI that just gets what you mean.
                </p>
                <div className="flex items-center justify-center">
                    <button 
                      onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} 
                      className="bg-[#FFD84D] text-[#1E1E1E] font-semibold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg shadow-yellow-500/20"
                    >
                        Generate Now
                    </button>
                </div>
            </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 px-4">
            <div className="max-w-5xl mx-auto text-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200/80">
                        <PaletteIcon className="w-10 h-10 text-[#5F6368] mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-[#1E1E1E] mb-2 uppercase">Choose Style</h3>
                        <p className="text-[#5F6368]">Select from curated styles or add your own.</p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200/80">
                        <LightningBoltIcon className="w-10 h-10 text-[#5F6368] mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-[#1E1E1E] mb-2 uppercase">Generate</h3>
                        <p className="text-[#5F6368]">Our AI creates unique images in seconds.</p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200/80">
                        <DownloadIcon className="w-10 h-10 text-[#5F6368] mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-[#1E1E1E] mb-2 uppercase">Download</h3>
                        <p className="text-[#5F6368]">Export in high-res for any use case.</p>
                    </div>
                </div>
            </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default HomePage;