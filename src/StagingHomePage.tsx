import React, { useState } from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, CheckIcon, StarIcon, PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, ProjectsIcon, DashboardIcon, UserIcon as AvatarUserIcon, BrandKitIcon, LightbulbIcon, ThumbnailIcon, MagicAdsIcon, UploadTrayIcon, PixaProductIcon, PixaEcommerceIcon, PixaTogetherIcon, PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon, PixaHeadshotIcon, CreditCoinIcon, ArrowRightIcon, CursorClickIcon, XIcon, ClockIcon
} from './components/icons';
import { HomeStyles } from './styles/Home.styles';
import { triggerCheckout } from './services/paymentService';
import { PaymentSuccessModal } from './components/PaymentSuccessModal';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';

interface HomePageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  appConfig: AppConfig | null;
}

const StagingHomePage: React.FC<HomePageProps> = ({ navigateTo, auth, appConfig }) => {
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [successCredits, setSuccessCredits] = useState<number | null>(null);
  const [successPackName, setSuccessPackName] = useState<string>('');

  const handleCheckout = (pack: any) => {
      if (!auth.isAuthenticated) {
          auth.openAuthModal();
          return;
      }
      if (!auth.user) return;
      setLoadingPackId(pack.name);
      triggerCheckout({
          user: auth.user, pkg: pack, type: 'plan',
          onSuccess: (updatedUser, totalCredits, packName) => {
              setSuccessPackName(packName);
              setSuccessCredits(totalCredits);
              auth.setUser(updatedUser);
              setLoadingPackId(null);
          },
          onCancel: () => setLoadingPackId(null),
          onError: (err) => { alert(err); setLoadingPackId(null); }
      });
  };

  return (
    <>
      <Header navigateTo={navigateTo} auth={auth} />
      <main className="bg-[#FFFFFF] pb-20 lg:pb-0">
        
        {/* RICH HERO SECTION */}
        <section id="home" className="pt-10 pb-24 px-4 overflow-hidden">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                {/* Left: Copy */}
                <div className="text-left animate-fadeIn">
                    <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full mb-8 shadow-sm">
                        <SparklesIcon className="w-4 h-4 text-indigo-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700">The New Standard in AI Production</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] mb-8 tracking-tighter">
                        Create Stunning Visuals, <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">No Prompt Required.</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-gray-500 max-w-xl leading-relaxed mb-12 font-medium">
                        MagicPixa uses Pixa Vision to see your products and understand your needs instantly. Transform raw photos into agency-grade assets in one click.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 mb-10">
                        <button 
                            onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} 
                            className="bg-[#1A1A1E] text-white px-10 py-5 rounded-[1.5rem] font-black text-lg shadow-2xl hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                        >
                            Start Creating for Free
                            <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        
                        <div className="flex items-center gap-4 px-6">
                            <div className="flex -space-x-3">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 overflow-hidden shadow-sm">
                                        <img src={`https://i.pravatar.cc/150?u=${i}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-black text-gray-900 leading-none">5,000+ Creators</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Trust Pixa Vision</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Rich Before/After Slider */}
                <div className="relative animate-fadeInRight">
                    {/* Background Decorative Element */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-500/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
                    
                    <BeforeAfterSlider 
                        beforeImage="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2000&auto=format&fit=crop" // Raw watch photo
                        afterImage="https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=2070&auto=format&fit=crop" // Studio watch photo
                    />

                    {/* Stats Card Overlay */}
                    <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 hidden md:block animate-bounce-slight">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <ClockIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Processing Time</p>
                                <p className="text-xl font-black text-gray-900 tracking-tight">&lt; 15 Seconds</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* REPLICA SECTIONS - Workflow */}
        <section className="py-24 px-4 bg-[#F6F7FA]">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">The MagicPixa Workflow</h2>
                    <p className="text-lg text-[#5F6368] font-medium">Drop your assets, we do the engineering.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {[
                        { step: "01", title: "Upload Asset", icon: <UploadTrayIcon className="w-10 h-10"/>, desc: "Drop your raw product photo or brand logo. Pixa Vision begins a forensic audit immediately." },
                        { step: "02", title: "Select Strategy", icon: <CursorClickIcon className="w-10 h-10"/>, desc: "Choose from pre-engineered visual archetypes (Luxury, Lifestyle, Tech). No text boxes involved." },
                        { step: "03", title: "Download 8K", icon: <SparklesIcon className="w-10 h-10"/>, desc: "Our engine renders a high-fidelity masterpiece with accurate lighting and shadows." }
                    ].map((item, i) => (
                        <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200/80 hover:shadow-md transition-all flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[#F6F7FA] rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
                                {item.icon}
                            </div>
                            <h3 className="text-xl font-bold text-[#1A1A1E] mb-3"><span className="text-indigo-200 mr-1">{item.step}.</span> {item.title}</h3>
                            <p className="text-[#5F6368] text-sm leading-relaxed font-medium">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

      </main>
      <Footer navigateTo={navigateTo} />
      {successCredits !== null && (
          <PaymentSuccessModal 
            creditsAdded={successCredits} 
            packName={successPackName}
            onClose={() => { setSuccessCredits(null); navigateTo('dashboard'); }} 
          />
      )}
    </>
  );
};

export default StagingHomePage;