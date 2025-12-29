import React from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, PixaProductIcon, MagicAdsIcon, 
  PixaHeadshotIcon, PixaCaptionIcon, 
  PixaInteriorIcon, PixaMockupIcon, 
  ArrowRightIcon, GlobeIcon, CubeIcon, ShieldCheckIcon
} from './components/icons';
import { ProfessionalHomeStyles as styles } from './styles/ProfessionalHome.styles';

interface ProfessionalHomePageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  appConfig: AppConfig | null;
}

const SHOWREEL_IMAGES = [
    { label: "Elite Product Shots", url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop", span: "md:col-span-2 md:row-span-2" },
    { label: "Executive Headshots", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop", span: "md:col-span-1 md:row-span-1" },
    { label: "Luxury Interiors", url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop", span: "md:col-span-1 md:row-span-2" },
    { label: "High-CTR Thumbnails", url: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?q=80&w=2070&auto=format&fit=crop", span: "md:col-span-1 md:row-span-1" },
    { label: "Pro Mockups", url: "https://images.unsplash.com/photo-1586717791821-3f44a563cc4c?q=80&w=2070&auto=format&fit=crop", span: "md:col-span-2 md:row-span-1" },
];

const BENTO_FEATURES = [
    {
        id: 'studio',
        title: "Product Studio",
        desc: "Professional photography, instantly.",
        icon: <PixaProductIcon className="w-10 h-10" />,
        size: "lg", // 2x2
        color: "blue"
    },
    {
        id: 'brand_stylist',
        title: "AdMaker",
        desc: "Convert at scale.",
        icon: <MagicAdsIcon className="w-10 h-10" />,
        size: "lg",
        color: "indigo"
    },
    {
        id: 'headshot',
        title: "Headshot Pro",
        desc: "Executive grade.",
        icon: <PixaHeadshotIcon className="w-6 h-6" />,
        size: "sm", // 1x1
        color: "purple"
    },
    {
        id: 'caption',
        title: "Caption AI",
        desc: "Viral Copy.",
        icon: <PixaCaptionIcon className="w-6 h-6" />,
        size: "sm",
        color: "teal"
    },
    {
        id: 'interior',
        title: "Spatial Design",
        desc: "Reimagine rooms.",
        icon: <PixaInteriorIcon className="w-10 h-10" />,
        size: "md", // 2x1
        color: "amber"
    },
    {
        id: 'mockup',
        title: "Mockup Engine",
        desc: "Physical proofs.",
        icon: <PixaMockupIcon className="w-6 h-6" />,
        size: "sm",
        color: "rose"
    }
];

const ProfessionalHome: React.FC<ProfessionalHomePageProps> = ({ navigateTo, auth }) => {
  return (
    <div className={styles.main}>
      <Header navigateTo={navigateTo} auth={auth} />
      
      {/* BACKGROUND DECORATION */}
      <div className={styles.meshGradient}></div>
      <div className={styles.grainTexture}></div>

      <main className="relative z-10">
        
        {/* HERO SECTION */}
        <section className={styles.heroWrapper}>
            <div className={styles.heroContainer}>
                <div className={styles.heroBadge}>
                    <SparklesIcon className="w-3 h-3 text-indigo-600" />
                    <span>The Production Standard for Generative Design</span>
                </div>
                
                <h1 className={styles.heroTitle}>
                    Unleash Your <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Creative Agency.</span>
                </h1>
                
                <p className={styles.heroSubtitle}>
                    From professional product shots to full-scale marketing campaigns. 
                    MagicPixa delivers world-class visual assets in seconds. No prompt required.
                </p>

                <div className={styles.heroActionGroup}>
                    <button 
                        onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                        className={styles.primaryButton}
                    >
                        Create with Pixa
                        <ArrowRightIcon className="w-5 h-5 ml-2"/>
                        <div className={styles.buttonGlow}></div>
                    </button>
                    <button 
                        onClick={() => auth.isAuthenticated ? navigateTo('dashboard', 'billing') : auth.openAuthModal()}
                        className={styles.secondaryButton}
                    >
                        View Pricing
                    </button>
                </div>
            </div>

            {/* MASONRY SHOWCASE WALL */}
            <div className={styles.masonryContainer}>
                <div className={styles.masonryGrid}>
                    {SHOWREEL_IMAGES.map((img, i) => (
                        <div key={i} className={`${img.span} ${styles.masonryItem}`}>
                            <img src={img.url} className="w-full h-full object-cover" alt={img.label} />
                            <div className={styles.masonryOverlay}>
                                <span className="text-[10px] font-black uppercase tracking-widest">{img.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* BENTO GRID: TOOLS */}
        <section className={styles.sectionPadding}>
            <div className={styles.contentWrapper}>
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div className="max-w-2xl text-left">
                        <h2 className={styles.sectionTitle}>Engineered for Impact.</h2>
                        <p className={styles.sectionSubtitle}>Every tool is architected to deliver high-converting, professional results for founders and agencies.</p>
                    </div>
                    <button onClick={() => navigateTo('dashboard', 'dashboard')} className="group flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-all">
                        Launch All Tools <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <div className={styles.bentoGrid}>
                    {BENTO_FEATURES.map((feature, i) => (
                        <div 
                            key={i} 
                            onClick={() => navigateTo('dashboard', feature.id as View)}
                            className={`${styles.bentoCard} ${feature.size === 'lg' ? styles.bentoLg : feature.size === 'md' ? styles.bentoMd : styles.bentoSm}`}
                        >
                            <div className={`${styles.bentoIconBox} ${feature.color === 'blue' ? 'bg-blue-50 text-blue-600' : feature.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-600'}`}>
                                {feature.icon}
                            </div>
                            <div className="mt-auto text-left">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{feature.title}</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">{feature.desc}</p>
                            </div>
                            <div className={styles.bentoArrow}>
                                <ArrowRightIcon className="w-4 h-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* TRUST/PHYSICS SECTION */}
        <section className={styles.sectionPadding}>
            <div className={styles.contentWrapper}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {[
                        { title: "Physical Realism", icon: <CubeIcon className="w-6 h-6"/>, desc: "Pixa understands material physics. Light interacts with glass, metal, and fabric exactly as it does in a studio." },
                        { title: "Identity Lock", icon: <ShieldCheckIcon className="w-6 h-6"/>, desc: "Our proprietary forensic anchor ensures your product's labels and faces remain 100% accurate." },
                        { title: "Global Context", icon: <GlobeIcon className="w-6 h-6"/>, desc: "Smart research agents analyze regional trends to ensure your ads resonate with local audiences." }
                    ].map((p, i) => (
                        <div key={i} className="flex flex-col items-start gap-6 group text-left">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-gray-100 group-hover:scale-110 group-hover:border-indigo-200 transition-all text-indigo-600">
                                {p.icon}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 mb-3">{p.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">{p.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-48 px-4 text-center relative overflow-hidden bg-white">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="max-w-3xl mx-auto relative z-10">
                <h2 className="text-5xl md:text-[84px] font-black mb-12 tracking-tighter text-slate-950 leading-[0.9]">
                    Upgrade your <br/> production.
                </h2>
                <button 
                    onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                    className={styles.primaryButton + " mx-auto"}
                >
                    Get Started for Free
                    <ArrowRightIcon className="w-5 h-5 ml-2"/>
                    <div className={styles.buttonGlow}></div>
                </button>
                <p className="mt-10 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">One-Click Production • Pro Quality • Zero Delay</p>
            </div>
        </section>

      </main>
      
      <Footer navigateTo={navigateTo} />
    </div>
  );
};

export default ProfessionalHome;
