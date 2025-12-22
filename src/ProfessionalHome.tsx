
import React from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, CheckIcon, StarIcon, PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, MockupIcon, ProjectsIcon, DashboardIcon, UserIcon, ArrowRightIcon, BrandKitIcon, LightbulbIcon, ThumbnailIcon, ApparelIcon, MagicAdsIcon, BuildingIcon, UploadTrayIcon, PixaProductIcon, PixaEcommerceIcon, PixaTogetherIcon, PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon, PixaMockupIcon, PixaHeadshotIcon, ShieldCheckIcon, CampaignStudioIcon, LightningIcon, CubeIcon, GlobeIcon, ChartBarIcon
} from './components/icons';
import { ProfessionalHomeStyles as styles } from './styles/ProfessionalHome.styles';

interface ProfessionalHomePageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  appConfig: AppConfig | null;
}

const DEPARTMENTS = [
    {
        title: "Commerce Visuals",
        icon: <PixaProductIcon className="w-7 h-7 text-white" />,
        features: [
            { id: 'studio', name: 'Elite Product Shots', desc: 'Commercial Grade' },
            { id: 'brand_kit', name: 'Merchant Packs', desc: 'Listing Automation' },
            { id: 'mockup', name: 'Physical Mockups', desc: 'High-Fidelity' }
        ]
    },
    {
        title: "Performance Ads",
        icon: <MagicAdsIcon className="w-7 h-7 text-white" />,
        features: [
            { id: 'brand_stylist', name: 'Pixa AdMaker', desc: 'Conversion Engine' },
            { id: 'thumbnail_studio', name: 'Thumbnail Pro', desc: 'CTR Engineering' },
            { id: 'caption', name: 'Content Strategy', desc: 'Social Narrative' }
        ]
    },
    {
        title: "Industry Verticals",
        icon: <BuildingIcon className="w-7 h-7 text-white" />,
        features: [
            { id: 'realty', name: 'Realty Suite', desc: 'Property Marketing' },
            { id: 'interior', name: 'Interior Engine', desc: 'Spatial Design' },
            { id: 'headshot', name: 'Headshot Pro', desc: 'Persona Building' }
        ]
    }
];

const PERSONAS = [
    {
        title: "Startup Founders",
        hook: "Speed to Market",
        desc: "Save weeks of photography delay. Launch your brand with world-class visuals generated from your raw smartphone prototype photos.",
        icon: <LightningIcon className="w-6 h-6" />
    },
    {
        title: "Agency Owners",
        hook: "Scale at Infinity",
        desc: "Replace a full design department with one Pixa seat. Deliver high-fidelity assets to clients instantly without increasing your payroll.",
        icon: <BuildingIcon className="w-6 h-6" />
    },
    {
        title: "Freelancers",
        hook: "Unlock Capacity",
        desc: "Automate the retouching and prompt work. Focus on creative direction while Pixa handles the 48-hour design cycle in seconds.",
        icon: <UserIcon className="w-6 h-6" />
    }
];

const ProfessionalHome: React.FC<ProfessionalHomePageProps> = ({ navigateTo, auth, appConfig }) => {
  return (
    <>
      <div className={styles.main}>
        <Header navigateTo={navigateTo} auth={auth} />
        
        {/* BACKGROUND DECOR */}
        <div className={styles.meshGradient}></div>
        <div className={styles.gridTexture}></div>

        <main className="relative">
          
          {/* HERO SECTION */}
          <section className={styles.heroWrapper}>
              <div className={styles.heroContainer}>
                  <div className={styles.heroBadge}>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                      <span>Generative Agency for High-Growth Brands</span>
                  </div>
                  
                  <h1 className={styles.heroTitle}>
                      Ship Commercial Art <br/>
                      <span className="text-white/20">Without the Agency.</span>
                  </h1>
                  
                  <p className={styles.heroSubtitle}>
                      Pixa replaces the 48-hour design wait with an instant production engine. 
                      High-fidelity, commercial-grade visuals for Founders who value ROI over overhead.
                  </p>

                  <div className={styles.heroActionGroup}>
                      <button 
                          onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                          className={styles.primaryButton}
                      >
                          <span className="relative z-10 flex items-center gap-3">
                            Start Generating (50 Free Credits) <ArrowRightIcon className="w-5 h-5"/>
                          </span>
                          <div className={styles.buttonGlow}></div>
                      </button>
                      <button 
                          onClick={() => navigateTo('home', undefined, 'roi')}
                          className={styles.secondaryButton}
                      >
                          View Case Studies
                      </button>
                  </div>

                  {/* PROOF VISUAL: Split Screen Mock */}
                  <div className={styles.comparisonWrapper}>
                      <div className={styles.comparisonBox}>
                          <div className={styles.comparisonLabelLeft}>Raw Smartphone Asset</div>
                          <div className={styles.comparisonLabelRight}>Pixa Ad Production</div>
                          
                          {/* Image Placeholder Layer */}
                          <div className="flex h-full w-full">
                              <div className="flex-1 bg-[url('https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center grayscale border-r border-white/10 relative">
                                  <div className="absolute inset-0 bg-black/40"></div>
                              </div>
                              <div className="flex-1 bg-[url('https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center relative">
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                  <div className="absolute bottom-8 left-8 text-left">
                                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Pixa AI Engine</p>
                                      <p className="text-xl font-black leading-none">NIKE AIR MAX • SERIES 2025</p>
                                  </div>
                              </div>
                          </div>
                          
                          {/* Slider Handle (Visual only) */}
                          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/50 z-30">
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-2xl">
                                  <div className="flex gap-1">
                                      <div className="w-1 h-3 bg-gray-900 rounded-full"></div>
                                      <div className="w-1 h-3 bg-gray-900 rounded-full"></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          {/* ROI SECTION (BENTO GRID) */}
          <section id="roi" className={styles.sectionPadding}>
              <div className={styles.contentWrapper}>
                  <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-16 px-4">
                      <div>
                          <h2 className={styles.sectionTitle}>Kill the Overhead.</h2>
                          <p className={styles.sectionSubtitle}>Why wait for designers to finish their morning coffee when Pixa is already rendering your campaign?</p>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                          <span>Trusted by 5,000+ Founders</span>
                          <div className="flex -space-x-2">
                              {[1,2,3,4].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0A0A0B] bg-gray-800"></div>)}
                          </div>
                      </div>
                  </div>

                  <div className={styles.bentoGrid}>
                      <div className={styles.bentoMain}>
                          <h3 className="text-3xl font-black mb-4">Prompt-less Performance</h3>
                          <p className="text-gray-400 max-w-sm mb-12">No need to learn complex AI syntax. Pixa understands business context and industry standards automatically.</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                              <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                  <p className="text-4xl font-black text-white mb-1">10s</p>
                                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Delivery Time</p>
                              </div>
                              <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                  <p className="text-4xl font-black text-white mb-1">₹10</p>
                                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Cost Per Asset</p>
                              </div>
                              <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                  <p className="text-4xl font-black text-white mb-1">8K</p>
                                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Raw Resolution</p>
                              </div>
                          </div>
                          
                          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                      </div>

                      <div className={styles.bentoSide}>
                          <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">Strategic Advantage</p>
                              <h3 className="text-2xl font-black text-white leading-tight mb-6">Replace your <br/> ₹50k Retainer.</h3>
                          </div>
                          <button 
                            onClick={() => auth.openAuthModal()}
                            className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all shadow-xl"
                          >
                              Start Saving Today
                          </button>
                          <div className="absolute top-0 right-0 p-8 opacity-10">
                              <ChartBarIcon className="w-32 h-32 text-white" />
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          {/* DEPARTMENTS SECTION */}
          <section className={styles.sectionPadding}>
              <div className="absolute inset-0 bg-[#141417]/30 border-y border-white/5"></div>
              <div className={styles.contentWrapper + " relative"}>
                  <div className="text-center mb-24">
                      <h2 className={styles.sectionTitle}>The Full Agency Suite</h2>
                      <p className={styles.sectionSubtitle}>Everything your marketing team needs, built on the Gemini architecture.</p>
                  </div>

                  <div className={styles.deptGrid}>
                      {DEPARTMENTS.map((dept, i) => (
                          <div key={i} className={styles.deptCard}>
                              <div className={styles.deptIcon}>
                                  {dept.icon}
                              </div>
                              <h3 className="text-2xl font-black mb-6 tracking-tight">{dept.title}</h3>
                              <div className="space-y-3">
                                  {dept.features.map(f => (
                                      <button 
                                          key={f.id}
                                          onClick={() => navigateTo('dashboard', f.id as View)}
                                          className={styles.featureItem}
                                      >
                                          <div className="text-left">
                                              <p className={styles.featureName}>{f.name}</p>
                                              <p className={styles.featureDesc}>{f.desc}</p>
                                          </div>
                                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 opacity-0 group-hover/item:opacity-100 transition-all">
                                            <ArrowRightIcon className="w-3 h-3 text-white" />
                                          </div>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </section>

          {/* PERSONAS SECTION */}
          <section className={styles.sectionPadding}>
              <div className={styles.contentWrapper}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {PERSONAS.map((p, i) => (
                          <div key={i} className={styles.personaCard}>
                              <div className={styles.personaIcon}>
                                  {p.icon}
                              </div>
                              <h3 className="text-2xl font-black mb-2">{p.title}</h3>
                              <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-6">{p.hook}</p>
                              <p className="text-gray-500 font-medium text-sm leading-relaxed">{p.desc}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </section>

          {/* FINAL CALL TO ACTION */}
          <section className="py-48 px-4 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-indigo-500/10 rounded-full blur-[120px] -z-10"></div>
              <div className="max-w-3xl mx-auto">
                  <h2 className="text-4xl md:text-7xl font-black mb-12 tracking-tighter">Ready to fire <br/> your designer?</h2>
                  <button 
                      onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                      className={styles.primaryButton}
                  >
                      <span className="relative z-10 flex items-center gap-3">
                        Join 5,000+ Teams <ArrowRightIcon className="w-5 h-5"/>
                      </span>
                      <div className={styles.buttonGlow}></div>
                  </button>
                  <p className="mt-8 text-gray-500 font-bold text-xs uppercase tracking-[0.3em]">No Retainers • No Contracts • No Prompts</p>
              </div>
          </section>

        </main>
        
        <Footer navigateTo={navigateTo} />
      </div>
    </>
  );
};

export default ProfessionalHome;
